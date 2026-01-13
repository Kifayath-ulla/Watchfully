-- Add DELETE policies for daily_goals and skipped_sessions tables
-- These allow users to manage their own data for privacy purposes

-- Allow users to delete their own daily goals
CREATE POLICY "Users can delete own daily goals"
  ON public.daily_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own skipped sessions
CREATE POLICY "Users can delete own skipped sessions"
  ON public.skipped_sessions FOR DELETE
  USING (auth.uid() = user_id);