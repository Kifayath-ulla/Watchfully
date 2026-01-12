import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WatchSession } from '@/types/video';

interface StartSessionParams {
  videoId: string;
  committedMinutes: number;
  startPositionSeconds: number;
}

interface EndSessionParams {
  endPositionSeconds: number;
  wasCompleted?: boolean;
  exitReason?: string;
}

export function useWatchSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentSession, setCurrentSession] = useState<WatchSession | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const startSession = useMutation({
    mutationFn: async ({ videoId, committedMinutes, startPositionSeconds }: StartSessionParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('watch_sessions')
        .insert({
          user_id: user.id,
          video_id: videoId,
          committed_minutes: committedMinutes,
          start_position_seconds: startPositionSeconds,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data as WatchSession;
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      sessionIdRef.current = data.id;
    }
  });

  const endSession = useMutation({
    mutationFn: async ({ endPositionSeconds, wasCompleted = false, exitReason }: EndSessionParams) => {
      if (!user || !sessionIdRef.current) throw new Error('No active session');

      const startedAt = currentSession?.started_at 
        ? new Date(currentSession.started_at) 
        : new Date();
      const actualMinutes = Math.round((new Date().getTime() - startedAt.getTime()) / 60000);

      const { data, error } = await supabase
        .from('watch_sessions')
        .update({
          end_position_seconds: endPositionSeconds,
          ended_at: new Date().toISOString(),
          actual_minutes: actualMinutes,
          was_completed: wasCompleted,
          exit_reason: exitReason || null
        })
        .eq('id', sessionIdRef.current)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as WatchSession;
    },
    onSuccess: () => {
      setCurrentSession(null);
      sessionIdRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['videos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['watch_sessions', user?.id] });
    }
  });

  const updateProgress = useCallback(async (videoId: string, positionSeconds: number, status?: 'in_progress' | 'completed') => {
    if (!user) return;

    const updateData: Record<string, unknown> = {
      current_position_seconds: Math.floor(positionSeconds)
    };

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .eq('user_id', user.id);

    // Don't invalidate on every update - too frequent
  }, [user]);

  return {
    currentSession,
    startSession,
    endSession,
    updateProgress,
    isSessionActive: !!currentSession
  };
}
