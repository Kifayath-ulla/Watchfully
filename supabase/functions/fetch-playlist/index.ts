import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaylistItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  position: number;
}

interface PlaylistResponse {
  playlistTitle: string;
  playlistThumbnail: string;
  channelTitle: string;
  videos: PlaylistItem[];
  totalResults: number;
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
      console.error('Missing or invalid authorization header');
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
      console.error('JWT verification failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated request from user: ${userId}`);

    const { playlistId } = await req.json();
    
    if (!playlistId) {
      console.error('Missing playlistId in request');
      return new Response(
        JSON.stringify({ error: 'playlistId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} fetching playlist: ${playlistId}`);

    // First, get playlist metadata
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
    const playlistResponse = await fetch(playlistUrl);
    const playlistData = await playlistResponse.json();

    if (playlistData.error) {
      console.error('YouTube API error (playlist):', playlistData.error);
      
      // Provide user-friendly error messages for common issues
      let userMessage = playlistData.error.message || 'Failed to fetch playlist';
      
      if (playlistData.error.code === 403) {
        if (playlistData.error.message?.includes('API v3 has not been used') || 
            playlistData.error.message?.includes('disabled')) {
          userMessage = 'YouTube API is not enabled. Please enable YouTube Data API v3 in Google Cloud Console for your API key project.';
        } else if (playlistData.error.message?.includes('quota')) {
          userMessage = 'YouTube API quota exceeded. Please try again later or check your API quota limits.';
        } else {
          userMessage = 'Access denied. Please check your YouTube API key permissions.';
        }
      } else if (playlistData.error.code === 400) {
        userMessage = 'Invalid request. Please check the playlist URL format.';
      } else if (playlistData.error.code === 404) {
        userMessage = 'Playlist not found. It may be private or deleted.';
      }
      
      return new Response(
        JSON.stringify({ error: userMessage, details: playlistData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!playlistData.items || playlistData.items.length === 0) {
      console.error('Playlist not found:', playlistId);
      return new Response(
        JSON.stringify({ error: 'Playlist not found or is private. Make sure the playlist is public or unlisted.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playlistInfo = playlistData.items[0].snippet;
    const playlistTitle = playlistInfo.title;
    const playlistThumbnail = playlistInfo.thumbnails?.high?.url || playlistInfo.thumbnails?.default?.url || '';
    const channelTitle = playlistInfo.channelTitle;

    console.log(`Playlist found: "${playlistTitle}" by ${channelTitle}`);

    // Fetch all videos from the playlist with pagination
    const allVideos: PlaylistItem[] = [];
    let nextPageToken: string | undefined;
    let totalResults = 0;

    do {
      const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      itemsUrl.searchParams.set('part', 'snippet,contentDetails');
      itemsUrl.searchParams.set('playlistId', playlistId);
      itemsUrl.searchParams.set('maxResults', '50'); // Max allowed by API
      itemsUrl.searchParams.set('key', apiKey);
      if (nextPageToken) {
        itemsUrl.searchParams.set('pageToken', nextPageToken);
      }

      console.log(`Fetching page ${nextPageToken ? nextPageToken : '1'}...`);
      const itemsResponse = await fetch(itemsUrl.toString());
      const itemsData = await itemsResponse.json();

      if (itemsData.error) {
        console.error('YouTube API error (items):', itemsData.error);
        return new Response(
          JSON.stringify({ error: itemsData.error.message || 'Failed to fetch playlist items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      totalResults = itemsData.pageInfo?.totalResults || 0;

      for (const item of itemsData.items || []) {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) continue; // Skip deleted/private videos

        const snippet = item.snippet;
        allVideos.push({
          videoId,
          title: snippet.title,
          channelTitle: snippet.videoOwnerChannelTitle || channelTitle,
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          position: snippet.position,
        });
      }

      nextPageToken = itemsData.nextPageToken;
      console.log(`Fetched ${allVideos.length} videos so far...`);
    } while (nextPageToken);

    // Now fetch durations for all videos (in batches of 50)
    const videoIds = allVideos.map(v => v.videoId);
    const videoDurations: Record<string, number> = {};

    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}&key=${apiKey}`;
      
      const videosResponse = await fetch(videosUrl);
      const videosData = await videosResponse.json();

      for (const video of videosData.items || []) {
        const duration = video.contentDetails?.duration;
        if (duration) {
          videoDurations[video.id] = parseDuration(duration);
        }
      }
    }

    // Combine video info with durations
    const videosWithDuration = allVideos.map(video => ({
      ...video,
      durationSeconds: videoDurations[video.videoId] || 0,
    }));

    console.log(`Successfully fetched ${videosWithDuration.length} videos from playlist`);

    const response: PlaylistResponse & { videos: (PlaylistItem & { durationSeconds: number })[] } = {
      playlistTitle,
      playlistThumbnail,
      channelTitle,
      videos: videosWithDuration,
      totalResults,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in fetch-playlist function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}
