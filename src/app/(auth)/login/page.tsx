"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl });
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative animate-fade-scale">
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
          <span className="text-primary-foreground font-bold font-heading">RF</span>
        </div>
        <span className="text-2xl font-bold font-heading group-hover:text-primary transition-colors">ResumeForge</span>
      </Link>

      {/* Card */}
      <div className="glass-card rounded-2xl p-8 neon-border shadow-2xl shadow-black/40">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold font-heading">Welcome to ResumeForge</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to optimize your resume with AI.
          </p>
        </div>

        {/* Google Sign In — Primary CTA */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          id="google-signin"
          className="w-full py-3.5 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gray-200"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 size={18} className="animate-spin text-gray-500" />
              Redirecting to Google...
            </>
          ) : (
            <>
              <GoogleIcon size={20} />
              Continue with Google
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          No account? One will be created automatically on your first Google sign-in.
        </p>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Email Login Toggle */}
        <button
          onClick={() => setShowAdminLogin(!showAdminLogin)}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ShieldCheck size={14} />
          {showAdminLogin ? "Hide Email Login" : "Email Login"}
          {showAdminLogin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Email Credentials Form */}
        {showAdminLogin && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-3 mt-3 animate-slide-up">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-12 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="admin-login-submit"
              className="w-full py-2.5 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
            <div className="text-center text-xs text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-muted" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
