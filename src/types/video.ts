export type VideoIntent = 'learning' | 'career' | 'curiosity' | 'leisure' | 'custom';
export type VideoStatus = 'not_started' | 'in_progress' | 'completed';

export interface Video {
  id: string;
  user_id: string;
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  current_position_seconds: number;
  status: VideoStatus;
  intent: VideoIntent;
  custom_intent: string | null;
  playlist_id: string | null;
  playlist_order: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Playlist {
  id: string;
  user_id: string;
  youtube_playlist_id: string | null;
  title: string;
  thumbnail_url: string | null;
  total_videos: number;
  intent: VideoIntent;
  custom_intent: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchSession {
  id: string;
  user_id: string;
  video_id: string;
  committed_minutes: number;
  actual_minutes: number;
  start_position_seconds: number;
  end_position_seconds: number;
  was_completed: boolean;
  exit_reason: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  target_minutes: number;
  achieved_minutes: number;
  videos_completed: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  daily_goal_minutes: number;
  silent_mode: boolean;
  exit_friction_enabled: boolean;
  browser_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}
