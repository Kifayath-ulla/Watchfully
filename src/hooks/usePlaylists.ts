import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Playlist, VideoIntent } from '@/types/video';
import { useToast } from '@/hooks/use-toast';

export function usePlaylists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const playlistsQuery = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Playlist[];
    },
    enabled: !!user
  });

  const addPlaylist = useMutation({
    mutationFn: async (playlist: {
      youtube_playlist_id: string;
      title: string;
      thumbnail_url?: string;
      total_videos: number;
      intent: VideoIntent;
      custom_intent?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          ...playlist
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists', user?.id] });
    }
  });

  const deletePlaylist = useMutation({
    mutationFn: async (playlistId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // First delete all videos in this playlist
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', user.id);
      
      if (videosError) throw videosError;
      
      // Then delete the playlist itself
      const { error: playlistError } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);
      
      if (playlistError) throw playlistError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['playlists', user?.id] });
      toast({
        title: 'Playlist deleted',
        description: 'All videos in the playlist have been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not delete playlist',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    playlists: playlistsQuery.data || [],
    isLoading: playlistsQuery.isLoading,
    error: playlistsQuery.error,
    addPlaylist,
    deletePlaylist,
  };
}
