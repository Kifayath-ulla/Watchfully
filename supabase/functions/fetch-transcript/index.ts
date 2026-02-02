import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptionTrack {
  id: string;
  snippet: {
    language: string;
    name: string;
    trackKind: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Transcript request from user: ${userId}`);

    const { videoId } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'videoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching captions for video: ${videoId}`);

    // First, get the list of caption tracks for the video
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    const captionsListResponse = await fetch(captionsListUrl);
    const captionsListData = await captionsListResponse.json();

    if (captionsListData.error) {
      console.error('YouTube Captions API error:', captionsListData.error);
      
      // Check if it's a forbidden error (captions disabled or private video)
      if (captionsListData.error.code === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Captions are not available for this video. The video owner may have disabled captions or the video is private.',
            unavailable: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: captionsListData.error.message || 'Failed to fetch captions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const captionTracks: CaptionTrack[] = captionsListData.items || [];
    
    if (captionTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No captions available for this video',
          unavailable: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find English captions first, then fall back to any available
    const englishTrack = captionTracks.find(
      track => track.snippet.language === 'en' || track.snippet.language.startsWith('en-')
    );
    const selectedTrack = englishTrack || captionTracks[0];

    console.log(`Found ${captionTracks.length} caption tracks, using: ${selectedTrack.snippet.language}`);

    // Unfortunately, downloading the actual caption content requires OAuth authentication
    // The captions.download endpoint requires the user to be the video owner or have explicit permission
    // So we'll use a workaround - fetch from a third-party transcript service
    
    // Use youtube-transcript-api style approach via a public endpoint
    const transcriptUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      // Fetch the video page to extract transcript data
      const pageResponse = await fetch(transcriptUrl);
      const pageHtml = await pageResponse.text();
      
      // Extract the caption track URL from the page
      const captionUrlMatch = pageHtml.match(/"captionTracks":\[{"baseUrl":"([^"]+)"/);
      
      if (!captionUrlMatch) {
        // Try alternative pattern for auto-generated captions
        const altMatch = pageHtml.match(/"playerCaptionsTracklistRenderer".*?"captionTracks":\[.*?"baseUrl":"([^"]+)"/s);
        
        if (!altMatch) {
          return new Response(
            JSON.stringify({ 
              error: 'Could not extract transcript. The video may not have captions enabled.',
              unavailable: true,
              availableTracks: captionTracks.map(t => ({
                language: t.snippet.language,
                name: t.snippet.name,
                kind: t.snippet.trackKind
              }))
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      let captionBaseUrl = captionUrlMatch ? captionUrlMatch[1] : null;
      
      if (!captionBaseUrl) {
        // Fallback: try to get from timedtext endpoint
        const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
        const timedTextResponse = await fetch(timedTextUrl);
        
        if (timedTextResponse.ok) {
          const timedTextData = await timedTextResponse.json();
          
          if (timedTextData.events) {
            const transcript = timedTextData.events
              .filter((event: any) => event.segs)
              .map((event: any) => ({
                start: Math.floor((event.tStartMs || 0) / 1000),
                duration: Math.floor((event.dDurationMs || 0) / 1000),
                text: event.segs.map((seg: any) => seg.utf8).join('').trim()
              }))
              .filter((item: any) => item.text);
            
            return new Response(
              JSON.stringify({ 
                transcript,
                language: 'en',
                isAutoGenerated: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Transcript extraction failed. Try a different video.',
            unavailable: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Decode the URL and fetch the captions
      captionBaseUrl = captionBaseUrl.replace(/\\u0026/g, '&');
      const captionResponse = await fetch(`${captionBaseUrl}&fmt=json3`);
      const captionData = await captionResponse.json();
      
      if (captionData.events) {
        const transcript = captionData.events
          .filter((event: any) => event.segs)
          .map((event: any) => ({
            start: Math.floor((event.tStartMs || 0) / 1000),
            duration: Math.floor((event.dDurationMs || 0) / 1000),
            text: event.segs.map((seg: any) => seg.utf8).join('').trim()
          }))
          .filter((item: any) => item.text);
        
        console.log(`Successfully extracted ${transcript.length} transcript segments`);
        
        return new Response(
          JSON.stringify({ 
            transcript,
            language: selectedTrack.snippet.language,
            isAutoGenerated: selectedTrack.snippet.trackKind === 'asr'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Could not parse transcript data',
          unavailable: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (extractError) {
      console.error('Transcript extraction error:', extractError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract transcript',
          unavailable: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in fetch-transcript function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
