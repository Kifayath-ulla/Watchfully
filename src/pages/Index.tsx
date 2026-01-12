import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Play, Plus, LogOut } from 'lucide-react';

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-medium text-foreground">
            Intentional Watch
          </h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground tracking-tight mb-4">
            Watch with intention.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Track your progress, set a time commitment, honor your intention.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              Start a focused session
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add a video
            </Button>
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center py-16 px-6 rounded-lg border border-dashed border-border bg-card/30">
            <p className="text-muted-foreground mb-4">
              Your queue is empty. Add a YouTube video or playlist to get started.
            </p>
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              Add your first video
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
