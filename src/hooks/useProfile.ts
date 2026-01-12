import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/video';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // Profile might not exist yet (race condition with trigger)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as Profile;
    },
    enabled: !!user
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    }
  });

  const toggleSilentMode = () => {
    if (profileQuery.data) {
      updateProfile.mutate({ silent_mode: !profileQuery.data.silent_mode });
    }
  };

  const toggleExitFriction = () => {
    if (profileQuery.data) {
      updateProfile.mutate({ exit_friction_enabled: !profileQuery.data.exit_friction_enabled });
    }
  };

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    updateProfile,
    toggleSilentMode,
    toggleExitFriction
  };
}
