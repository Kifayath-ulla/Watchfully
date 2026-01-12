-- Create enum for video intent/reason
CREATE TYPE public.video_intent AS ENUM ('learning', 'career', 'curiosity', 'leisure', 'custom');

-- Create enum for video status
CREATE TYPE public.video_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Profiles table for user settings
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  daily_goal_minutes INTEGER DEFAULT 45,
  silent_mode BOOLEAN DEFAULT FALSE,
  exit_friction_enabled BOOLEAN DEFAULT TRUE,
  browser_notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  current_position_seconds INTEGER DEFAULT 0,
  status public.video_status DEFAULT 'not_started',
  intent public.video_intent DEFAULT 'curiosity',
  custom_intent TEXT,
  playlist_id UUID,
  playlist_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, youtube_video_id)
);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for videos
CREATE POLICY "Users can view own videos"
  ON public.videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- Playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  youtube_playlist_id TEXT,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  total_videos INTEGER DEFAULT 0,
  intent public.video_intent DEFAULT 'curiosity',
  custom_intent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for playlists
CREATE POLICY "Users can view own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Add foreign key for playlist_id in videos (after playlists table exists)
ALTER TABLE public.videos
ADD CONSTRAINT videos_playlist_fk
FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE SET NULL;

-- Watch sessions table for tracking commitment
CREATE TABLE public.watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  committed_minutes INTEGER NOT NULL,
  actual_minutes INTEGER DEFAULT 0,
  start_position_seconds INTEGER DEFAULT 0,
  end_position_seconds INTEGER DEFAULT 0,
  was_completed BOOLEAN DEFAULT FALSE,
  exit_reason TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on watch_sessions
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for watch_sessions
CREATE POLICY "Users can view own sessions"
  ON public.watch_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.watch_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.watch_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily goals tracking
CREATE TABLE public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_minutes INTEGER NOT NULL,
  achieved_minutes INTEGER DEFAULT 0,
  videos_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_goals
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_goals
CREATE POLICY "Users can view own daily goals"
  ON public.daily_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goals"
  ON public.daily_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goals"
  ON public.daily_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Skipped sessions log for accountability
CREATE TABLE public.skipped_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  reason TEXT,
  planned_minutes INTEGER,
  completed_minutes INTEGER DEFAULT 0,
  skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on skipped_sessions
ALTER TABLE public.skipped_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for skipped_sessions
CREATE POLICY "Users can view own skipped sessions"
  ON public.skipped_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skipped sessions"
  ON public.skipped_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_goals_updated_at
  BEFORE UPDATE ON public.daily_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_playlist_id ON public.videos(playlist_id);
CREATE INDEX idx_watch_sessions_user_id ON public.watch_sessions(user_id);
CREATE INDEX idx_watch_sessions_video_id ON public.watch_sessions(video_id);
CREATE INDEX idx_daily_goals_user_date ON public.daily_goals(user_id, date);