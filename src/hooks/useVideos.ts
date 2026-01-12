import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Video, VideoIntent, VideoStatus } from '@/types/video';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export function useVideos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const videosQuery = useQuery({
    queryKey: ['videos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Video[];
    },
    enabled: !!user
  });

  const addVideo = useMutation({
    mutationFn: async (video: {
      youtube_video_id: string;
      title: string;
      channel_name?: string;
      thumbnail_url?: string;
      duration_seconds: number;
      intent?: VideoIntent;
      custom_intent?: string;
      playlist_id?: string;
      playlist_order?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          ...video
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('This video is already in your queue');
        }
        throw error;
      }
      
      return data as Video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      toast({
        title: 'Video added',
        description: 'Ready when you are.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not add video',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateVideoProgress = useMutation({
    mutationFn: async ({ 
      videoId, 
      position,
      status 
    }: { 
      videoId: string; 
      position: number;
      status?: VideoStatus;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData: Partial<Video> = {
        current_position_seconds: position
      };
      
      if (status) {
        updateData.status = status;
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      
      const { data, error } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
    }
  });

  const updateVideoIntent = useMutation({
    mutationFn: async ({ 
      videoId, 
      intent,
      customIntent 
    }: { 
      videoId: string; 
      intent: VideoIntent;
      customIntent?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('videos')
        .update({
          intent,
          custom_intent: customIntent || null
        })
        .eq('id', videoId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
    }
  });

  const deleteVideo = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      toast({
        title: 'Video removed',
        description: 'Removed from your queue.',
      });
    }
  });

  const markComplete = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('videos')
        .update({
          status: 'completed' as VideoStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', videoId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      toast({
        title: 'Video completed',
        description: 'Well done.',
      });
    }
  });

  const reorderVideos = useCallback(async (reorderedVideos: Video[]) => {
    if (!user) return;
    
    // Optimistically update the cache
    queryClient.setQueryData(['videos', user.id], reorderedVideos);
    
    // Update playlist_order in database for each video
    const updates = reorderedVideos.map((video, index) => 
      supabase
        .from('videos')
        .update({ playlist_order: index })
        .eq('id', video.id)
        .eq('user_id', user.id)
    );
    
    try {
      await Promise.all(updates);
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['videos', user.id] });
      toast({
        title: 'Failed to reorder',
        description: 'Could not save the new order.',
        variant: 'destructive'
      });
    }
  }, [user, queryClient, toast]);

  return {
    videos: videosQuery.data || [],
    isLoading: videosQuery.isLoading,
    error: videosQuery.error,
    addVideo,
    updateVideoProgress,
    updateVideoIntent,
    deleteVideo,
    markComplete,
    reorderVideos
  };
}
