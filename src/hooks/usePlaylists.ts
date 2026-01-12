import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Playlist } from '@/types/video';

export function usePlaylists() {
  const { user } = useAuth();
  
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

  return {
    playlists: playlistsQuery.data || [],
    isLoading: playlistsQuery.isLoading,
    error: playlistsQuery.error,
  };
}
