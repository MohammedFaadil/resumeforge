"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Clock, Mail, LogOut, ArrowLeft, RefreshCw } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      <div className="w-full max-w-lg relative animate-fade-scale text-center">
        {/* Logo — click to go to landing page */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
            <span className="text-primary-foreground font-bold font-heading">RF</span>
          </div>
          <span className="text-2xl font-bold font-heading group-hover:text-primary transition-colors">ResumeForge</span>
        </Link>

        <div className="glass-card rounded-2xl p-10 border border-amber-500/20 shadow-2xl shadow-black/40">
          {/* Animated clock icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 animate-float">
            <Clock size={36} className="text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold font-heading mb-3">Account Pending Approval</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Your account has been created successfully. An administrator needs to review and
            approve your access. This usually takes less than 24 hours.
          </p>

          {/* Steps */}
          <div className="text-left space-y-3 mb-8 p-5 rounded-xl bg-muted/20 border border-border/40">
            {[
              { icon: <Mail size={16} />, text: "You'll receive an email when your account is approved" },
              { icon: <RefreshCw size={16} />, text: "Log back in after approval to access the platform" },
              { icon: <Clock size={16} />, text: "Typical approval time: under 24 hours" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="text-amber-400 shrink-0">{step.icon}</div>
                {step.text}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 py-3 px-5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 py-3 px-5 rounded-xl bg-muted/50 border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
