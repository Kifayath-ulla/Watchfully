import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthMode = "login" | "signup" | "forgot";

const motivationalQuotes = [
  "Watch with intention. Finish what you start.",
  "Stop the scroll. Start the progress.",
  "Every minute counts. Make it intentional.",
  "Eliminate procrastination. Embrace focus.",
  "Your time is valuable. Spend it wisely.",
  "Less scrolling, more learning.",
  "Focus is your superpower.",
  "One video at a time. No distractions.",
  "Commit to finish. That's the difference.",
  "Break the cycle. Watch mindfully.",
];

// Animated doodle paths
const doodlePaths = [
  "M10,50 Q30,10 50,50 T90,50", // wave
  "M0,0 L100,100", // diagonal
  "M50,0 L50,100", // vertical
  "M0,50 L100,50", // horizontal
  "M20,20 Q50,80 80,20", // curve
  "M10,90 Q50,10 90,90", // u-curve
  "M0,30 Q50,90 100,30", // wave2
  "M20,50 C30,10 70,90 80,50", // s-curve
];

interface Doodle {
  id: number;
  path: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
  opacity: number;
}

function AnimatedDoodle({ doodle }: { doodle: Doodle }) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: `${doodle.startX}%`,
        top: `${doodle.startY}%`,
        transform: `rotate(${doodle.rotation}deg) scale(${doodle.scale})`,
        opacity: doodle.opacity,
        animation: `doodleFloat ${doodle.duration}s ease-in-out ${doodle.delay}s infinite alternate`,
      }}
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
    >
      <path
        d={doodle.path}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary/20"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: 200,
          animation: `doodleDraw ${doodle.duration * 0.5}s ease-out ${doodle.delay}s forwards`,
        }}
      />
    </svg>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Generate random doodles
  const doodles = useMemo<Doodle[]>(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      path: doodlePaths[Math.floor(Math.random() * doodlePaths.length)],
      startX: Math.random() * 100,
      startY: Math.random() * 100,
      targetX: Math.random() * 100,
      targetY: Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.5,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Rotate quotes with fade animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
        setFadeIn(true);
      }, 300);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode !== "forgot") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: "Reset failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We sent you a password reset link.",
          });
          setMode("login");
          setEmail("");
        }
      } else if (mode === "login") {
        const { error } = await signIn(email, password, rememberMe);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Unable to sign in",
              description: "Please check your email and password.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign in failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Try signing in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome",
            description: "Your account has been created.",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "Welcome back";
      case "signup":
        return "Create an account";
      case "forgot":
        return "Reset password";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login":
        return "Sign in to continue your focused sessions";
      case "signup":
        return "Start your journey of intentional watching";
      case "forgot":
        return "Enter your email to receive a reset link";
    }
  };

  const currentQuote = motivationalQuotes[quoteIndex];

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      {/* CSS for doodle animations */}
      <style>{`
        @keyframes doodleFloat {
          0% {
            transform: translate(0, 0) rotate(var(--rotation, 0deg)) scale(var(--scale, 1));
          }
          50% {
            transform: translate(calc(var(--tx, 20px)), calc(var(--ty, 20px))) rotate(calc(var(--rotation, 0deg) + 15deg)) scale(calc(var(--scale, 1) * 1.1));
          }
          100% {
            transform: translate(0, 0) rotate(var(--rotation, 0deg)) scale(var(--scale, 1));
          }
        }
        @keyframes doodleDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          25% { transform: translateY(-30px) translateX(15px) rotate(5deg); }
          50% { transform: translateY(-10px) translateX(-10px) rotate(-3deg); }
          75% { transform: translateY(-40px) translateX(20px) rotate(3deg); }
        }
        @keyframes dashToBorder {
          0% { transform: translateX(0) translateY(0); opacity: 0.3; }
          40% { transform: translateX(calc(50vw * var(--dir-x, 1))) translateY(calc(50vh * var(--dir-y, 1))); opacity: 0.6; }
          60% { transform: translateX(calc(50vw * var(--dir-x, 1))) translateY(calc(50vh * var(--dir-y, 1))); opacity: 0.6; }
          100% { transform: translateX(0) translateY(0); opacity: 0.3; }
        }
      `}</style>

      {/* Animated background doodles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft glowing orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated doodle lines */}
        {doodles.map((doodle) => (
          <AnimatedDoodle key={doodle.id} doodle={doodle} />
        ))}

        {/* Floating text quotes in background */}
        <div 
          className="absolute top-[15%] left-[8%] text-primary/10 text-sm font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 20s ease-in-out infinite' }}
        >
          Focus more
        </div>
        <div 
          className="absolute top-[25%] right-[12%] text-primary/10 text-xs font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 25s ease-in-out infinite', animationDelay: '-5s' }}
        >
          Scroll less
        </div>
        <div 
          className="absolute bottom-[30%] left-[15%] text-primary/10 text-sm font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 22s ease-in-out infinite', animationDelay: '-10s' }}
        >
          Learn intentionally
        </div>
        <div 
          className="absolute top-[60%] right-[8%] text-primary/10 text-xs font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 18s ease-in-out infinite', animationDelay: '-3s' }}
        >
          Finish what you start
        </div>
        <div 
          className="absolute bottom-[20%] right-[20%] text-primary/10 text-sm font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 24s ease-in-out infinite', animationDelay: '-8s' }}
        >
          Break the cycle
        </div>
        <div 
          className="absolute top-[40%] left-[5%] text-primary/10 text-xs font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 21s ease-in-out infinite', animationDelay: '-12s' }}
        >
          One video at a time
        </div>
        <div 
          className="absolute bottom-[45%] right-[5%] text-primary/10 text-sm font-medium whitespace-nowrap"
          style={{ animation: 'floatSlow 19s ease-in-out infinite', animationDelay: '-7s' }}
        >
          Mindful watching
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Brand and Animated Quote */}
          <div className="text-center space-y-4">
            <h1 className="font-serif text-5xl font-medium tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_8s_ease_infinite]">
              Watchfully
            </h1>
            <div
              className={`h-8 transition-all duration-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            >
              <p className="text-base text-muted-foreground italic">"{currentQuote}"</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="space-y-1 pb-4">
              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              )}
              <CardTitle className="text-xl font-medium">{getTitle()}</CardTitle>
              <CardDescription>{getDescription()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium">
                      Display name
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className={`bg-background ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: undefined });
                        }}
                        className={`bg-background pr-10 ${errors.password ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrors({});
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Please wait..."
                    : mode === "login"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset link"}
                </Button>
              </form>

              {mode !== "forgot" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-250"
                  >
                    {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center relative z-10 space-y-1">
        <p className="text-sm text-muted-foreground">Sign in to save your progress across devices</p>
        <p className="text-xs text-muted-foreground opacity-75">made with love by kiffu&lt;3</p>
      </footer>

      {/* Gradient animation keyframes */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
