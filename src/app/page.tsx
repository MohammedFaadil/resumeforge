import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  FileSearch, Sparkles, PenLine, Target,
  ArrowRight, CheckCircle2, TrendingUp, ShieldCheck, Zap,
  LayoutDashboard,
} from "lucide-react";


const stats = [
  { value: "9.5+", label: "Average ATS Score After Optimization" },
  { value: "3×", label: "More Interview Callbacks" },
  { value: "100%", label: "Honest — No Fabrication Ever" },
  { value: "<2 min", label: "Time to Tailored Resume" },
];

const features = [
  {
    icon: FileSearch,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "Instant ATS Score",
    desc: "Upload your PDF and receive a detailed 7-dimension ATS compatibility audit in seconds — keyword density, formatting, action verbs, and more.",
    step: "01",
  },
  {
    icon: Sparkles,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    title: "AI Optimization",
    desc: "Our AI rewrites every bullet with stronger action verbs, injects ATS-relevant keywords, and restructures your resume to score 9.5+ — using only your real experience.",
    step: "02",
  },
  {
    icon: PenLine,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "Online Resume Editor",
    desc: "Fine-tune every section directly in your browser. Edit your summary, bullets, skills, and contact details before exporting a pixel-perfect PDF.",
    step: "03",
  },
  {
    icon: Target,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Job-Specific Tailoring",
    desc: "Paste any job description and get a perfectly matched resume with keyword saturation, reordered priorities, and a targeted summary — ATS score guaranteed above 9.5.",
    step: "04",
  },
];

const trustPoints = [
  "No fabrication — we never add fake metrics or tools",
  "Real ATS verification, not just self-scoring",
  "LaTeX-compiled professional PDF output",
  "Honest keyword gap analysis included",
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className="relative z-10 px-8 py-5 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-background/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-bold text-sm font-heading">RF</span>
          </div>
          <span className="text-xl font-bold font-heading tracking-tight">ResumeForge</span>
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            /* ── Logged-in nav ── */
            <>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/20 border border-border/30">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:block">{user.name?.split(" ")[0]}</span>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
            </>
          ) : (
            /* ── Logged-out nav ── */
            <>
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/20"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
              >
                Get Started Free
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-36 overflow-hidden">

          {/* Glow layers */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-[140px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan/5 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold mb-8 animate-fade-scale tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI-Powered ATS Optimization · No Fabrication
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold font-heading tracking-tight mb-7 animate-slide-up leading-[1.05]">
              Beat Every{" "}
              <span className="gradient-text">ATS Filter.</span>
              <br />
              Land Your{" "}
              <span className="gradient-text">Dream Job.</span>
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              ResumeForge analyzes your resume, rewrites it for{" "}
              <strong className="text-foreground">9.5+ ATS compatibility</strong>, and tailors it to any job description —
              all using your real experience, no exaggeration.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95"
                  >
                    <LayoutDashboard size={18} />
                    Go to Dashboard
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/dashboard/history"
                    className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium rounded-2xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/10 transition-all"
                  >
                    View My Resumes
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95"
                  >
                    Start Optimizing Free
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium rounded-2xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/10 transition-all"
                  >
                    Sign In to Dashboard
                  </Link>
                </>
              )}
            </div>


            {/* Trust strip */}
            <div
              className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              {trustPoints.map((p) => (
                <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats Strip ────────────────────────────────────────────────── */}
        <section className="px-6 py-10 border-y border-border/30 bg-muted/5">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold font-heading gradient-text mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────────────────── */}
        <section className="px-6 py-24 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-4 uppercase tracking-wide">
              <Zap size={12} /> 4-Step Flow
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight mb-4">
              From upload to job-ready in minutes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
              A structured pipeline that takes your existing resume and transforms it into a perfectly optimized, ATS-verified document.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative glass-card rounded-2xl p-7 border ${f.border} hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
              >
                {/* Step number */}
                <div className="absolute top-5 right-6 text-5xl font-black text-border/30 font-heading select-none">
                  {f.step}
                </div>
                <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border ${f.border}`}>
                  <f.icon size={22} className={f.color} />
                </div>
                <h3 className="text-lg font-bold font-heading mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ethics / Integrity Section ──────────────────────────────────── */}
        <section className="px-6 py-16 bg-muted/5 border-y border-border/20">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck size={38} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-3 uppercase tracking-wide">
                Our Integrity Promise
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold font-heading tracking-tight mb-3">
                We never lie on your behalf.
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                ResumeForge only uses what's already in your resume. We reframe, reorder, and reword — using the exact
                language of the job description. We never add fake metrics, fabricated projects, or invented technologies.
                Your resume stays 100% truthful while becoming maximally competitive.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-12">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/15 blur-[80px] rounded-full" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold mb-5 uppercase tracking-wide">
                  <TrendingUp size={12} /> Free to Start
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight mb-4">
                  Your next job starts{" "}
                  <span className="gradient-text">with your resume.</span>
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Join professionals who've used ResumeForge to get past ATS filters and into the hands of real hiring managers.
                </p>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  Get Your 9.5+ ATS Score
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs font-heading">RF</span>
            </div>
            <span className="font-semibold font-heading text-sm">ResumeForge</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 ResumeForge. Built to help real candidates win honestly.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
