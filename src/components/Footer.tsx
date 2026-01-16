import { Linkedin, Twitter } from 'lucide-react';
import { FeedbackForm } from '@/components/FeedbackForm';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Feedback */}
          <div className="flex items-center gap-4">
            <FeedbackForm />
          </div>

          {/* Center: Branding */}
          <p className="text-xs text-muted-foreground opacity-75 order-last sm:order-none">
            made with love by kiffu&lt;3
          </p>

          {/* Right: Social Links */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/in/thisiskifayath"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/thisiskifayath"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
