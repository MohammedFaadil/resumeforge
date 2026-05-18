"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      setIsSent(true);
      toast.success("Password reset instructions sent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative animate-fade-scale">
        <div className="glass-card rounded-2xl p-8 neon-border shadow-2xl shadow-black/40">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold font-heading">Reset Password</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter your email to receive a password reset link.
            </p>
          </div>

          {isSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-500/10 text-green-500 rounded-xl text-sm border border-green-500/20">
                Check your email (and spam folder) for a link to reset your password.
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : "Send Reset Link"}
              </button>
              
              <div className="text-center mt-4">
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                  <ArrowLeft size={12} /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
