import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestVideo {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string | null;
  duration_seconds: number;
  current_position_seconds: number;
  status: 'not_started' | 'in_progress' | 'completed';
  intent: 'learning' | 'career' | 'curiosity' | 'leisure';
  created_at: string;
}

interface GuestContextType {
  isGuestMode: boolean;
  guestVideos: GuestVideo[];
  enableGuestMode: () => void;
  exitGuestMode: () => void;
  addGuestVideo: (video: Omit<GuestVideo, 'id' | 'created_at'>) => void;
  removeGuestVideo: (id: string) => void;
  updateGuestVideo: (id: string, updates: Partial<GuestVideo>) => void;
}

const GUEST_MODE_KEY = 'watchfully-guest-mode';
const GUEST_VIDEOS_KEY = 'watchfully-guest-videos';

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestVideos, setGuestVideos] = useState<GuestVideo[]>([]);

  // Load guest state on mount
  useEffect(() => {
    const guestMode = localStorage.getItem(GUEST_MODE_KEY) === 'true';
    if (guestMode) {
      setIsGuestMode(true);
      const storedVideos = localStorage.getItem(GUEST_VIDEOS_KEY);
      if (storedVideos) {
        try {
          setGuestVideos(JSON.parse(storedVideos));
        } catch {
          setGuestVideos([]);
        }
      }
    }
  }, []);

  // Persist guest videos
  useEffect(() => {
    if (isGuestMode) {
      localStorage.setItem(GUEST_VIDEOS_KEY, JSON.stringify(guestVideos));
    }
  }, [guestVideos, isGuestMode]);

  const enableGuestMode = () => {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuestMode(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem(GUEST_MODE_KEY);
    localStorage.removeItem(GUEST_VIDEOS_KEY);
    setIsGuestMode(false);
    setGuestVideos([]);
  };

  const addGuestVideo = (video: Omit<GuestVideo, 'id' | 'created_at'>) => {
    const newVideo: GuestVideo = {
      ...video,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    setGuestVideos(prev => [...prev, newVideo]);
  };

  const removeGuestVideo = (id: string) => {
    setGuestVideos(prev => prev.filter(v => v.id !== id));
  };

  const updateGuestVideo = (id: string, updates: Partial<GuestVideo>) => {
    setGuestVideos(prev => 
      prev.map(v => v.id === id ? { ...v, ...updates } : v)
    );
  };

  return (
    <GuestContext.Provider value={{
      isGuestMode,
      guestVideos,
      enableGuestMode,
      exitGuestMode,
      addGuestVideo,
      removeGuestVideo,
      updateGuestVideo,
    }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
