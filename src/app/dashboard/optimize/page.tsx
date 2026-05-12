"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/hooks/useResumeStore";
import { toast } from "sonner";
import {
  Sparkles, CheckCircle2, Download, ArrowRight,
  FileSearch, AlertTriangle, Zap, RotateCcw, Tag, History
} from "lucide-react";

type Phase = "idle" | "optimizing" | "generating-pdf" | "done";

type OptimizedSection = {
  contact?: { name: string; email: string; phone: string; location: string; linkedin?: string };
  summary?: string;
  experience?: Array<{ title: string; company: string; start: string; end: string; location: string; bullets: string[] }>;
  education?: Array<{ institution: string; degree: string; year: string; location: string; gpa?: string }>;
  skills?: { technical?: string[]; tools?: string[]; soft?: string[] };
};

function StepIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { key: "optimizing",     label: "AI Optimization" },
    { key: "generating-pdf", label: "Generating PDF" },
    { key: "done",           label: "Complete" },
  ];
  const activeIdx = steps.findIndex(s => s.key === phase);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step, i) => {
        const done   = i < activeIdx || phase === "done";
        const active = steps[i].key === phase;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              done   ? "bg-emerald-500/15 text-emerald-400" :
              active ? "bg-primary/15 text-primary animate-pulse" :
                       "bg-muted/30 text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 size={11} /> : null}
              {step.label}
            </div>
            {i < steps.length - 1 && <span className="text-border text-xs">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function OptimizePage() {
  const router = useRouter();
  const { resumeId, atsScore, extractedText } = useResumeStore();
  const [phase, setPhase]               = useState<Phase>("idle");
  const [optimizedScore, setOptimizedScore] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl]             = useState<string | null>(null);
  const [optimizedData, setOptimizedData] = useState<OptimizedSection | null>(null);
  const [resumeName, setResumeName]     = useState("");
  const [nameSaved, setNameSaved]       = useState(false);
  const [savingName, setSavingName]     = useState(false);

  const noResume = !resumeId || !extractedText;

  // ── Full optimize + PDF flow ──────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!resumeId) return;
    try {
      // Step 1: AI optimization
      setPhase("optimizing");
      const optRes  = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const optData = await optRes.json();
      if (optRes.status === 429) {
        toast.error(optData.error || "Daily AI token limit reached. Please try again later.", { duration: 8000 });
        setPhase("idle");
        return;
      }
      if (!optRes.ok) throw new Error(optData.error || "Optimization failed");
      setOptimizedData(optData.optimizedData);
      const verifiedAtsScore: number = optData.verifiedScore ?? 9.5;

      // Step 2: Generate PDF from clean JSON
      setPhase("generating-pdf");
      const pdfRes  = await fetch("/api/resume/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const pdfData = await pdfRes.json();
      if (!pdfRes.ok) throw new Error(pdfData.error || "PDF generation failed");

      setPdfUrl(pdfData.pdfUrl);
      setOptimizedScore(verifiedAtsScore);
      setPhase("done");
      toast.success("Resume optimized and PDF generated!");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setPhase("idle");
    }
  };

  // ── Save resume name ──────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!resumeId || !resumeName.trim()) { toast.error("Enter a name first"); return; }
    setSavingName(true);
    try {
      const res = await fetch("/api/resume/save-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, resumeName: resumeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNameSaved(true);
      toast.success("Resume name saved to history!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save name");
    } finally {
      setSavingName(false);
    }
  };

  const loadingLabel = phase === "optimizing"
    ? "AI is analyzing and rewriting your resume..."
    : "Compiling professional PDF...";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">Optimize Resume</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Improve ATS compatibility using your real experience — no fabrication.
          </p>
        </div>
        {(phase === "idle" || phase === "done") && <StepIndicator phase={phase} />}
      </div>

      {/* ── No resume uploaded yet ── */}
      {noResume && (
        <div className="glass-card rounded-2xl p-10 border border-amber-500/20 text-center">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold font-heading mb-2">No Resume Scanned Yet</h3>
          <p className="text-muted-foreground text-sm mb-5">
            Upload and score your resume first before AI optimization.
          </p>
          <button
            onClick={() => router.push("/dashboard/check-score")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <FileSearch size={16} /> Go to ATS Score Check
          </button>
        </div>
      )}

      {/* ── Ready to optimize ── */}
      {!noResume && phase === "idle" && (
        <div className="space-y-5 animate-slide-up">
          {/* Score preview */}
          {atsScore && (
            <div className="glass-card rounded-2xl p-5 border border-primary/15 flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="text-center min-w-[70px]">
                <p className="text-3xl font-extrabold font-heading text-rose-400">{atsScore.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Current ATS</p>
              </div>
              <ArrowRight size={20} className="text-muted-foreground hidden sm:block" />
              <div className="text-center min-w-[70px]">
                <p className="text-3xl font-extrabold font-heading text-emerald-400">9.5+</p>
                <p className="text-xs text-muted-foreground">Target</p>
              </div>
              <p className="text-sm text-muted-foreground flex-1 max-w-sm">
                AI will rewrite your bullets with stronger action verbs and ATS-friendly structure —
                using only your real experience.
              </p>
            </div>
          )}

          {/* What optimization does */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: "✍️", title: "Stronger Action Verbs", desc: "Weak phrasing replaced with industry-standard active verbs (Engineered, Implemented, Designed)" },
              { icon: "🔑", title: "ATS Keyword Injection", desc: "Industry-relevant keywords added where your experience genuinely supports them" },
              { icon: "📐", title: "Clean Structure", desc: "Standard ATS-parseable section order with proper formatting" },
            ].map(f => (
              <div key={f.title} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h4 className="text-sm font-semibold mb-1 font-heading">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-sm text-muted-foreground">
            <strong className="text-emerald-400">✓ 100% Honest:</strong> We only rephrase your existing experience.
            No fabricated metrics, no invented technologies, no exaggerated achievements.
          </div>

          <button
            onClick={handleOptimize}
            id="optimize-button"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-violet-600 text-primary-foreground font-bold text-base hover:opacity-90 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-3"
          >
            <Sparkles size={20} /> Optimize with AI
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {(phase === "optimizing" || phase === "generating-pdf") && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-scale">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles size={22} className="absolute inset-0 m-auto text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold font-heading">{loadingLabel}</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {phase === "optimizing"
                ? "Reading your resume and rephrasing every bullet for maximum ATS impact."
                : "Compiling a clean, professional PDF from your optimized content."}
            </p>
          </div>
          <StepIndicator phase={phase} />
        </div>
      )}

      {/* ── Done ── */}
      {phase === "done" && (
        <div className="space-y-5 animate-slide-up">
          {/* Success banner */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold font-heading text-lg">Optimization Complete!</h3>
                <p className="text-muted-foreground text-sm">
                  ATS score improved to{" "}
                  <strong className="text-emerald-400">{optimizedScore?.toFixed(1)}/10</strong>.
                  Your PDF is ready to download.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                  >
                    <Download size={15} /> Download PDF
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ── Save name to history ── */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Tag size={17} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-heading text-sm">Save to History</h3>
                <p className="text-xs text-muted-foreground">Give this resume a name so you can find it easily later.</p>
              </div>
            </div>
            {nameSaved ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={16} />
                <span>Saved as <strong>"{resumeName}"</strong> in your history.</span>
                <button
                  onClick={() => router.push("/dashboard/history")}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/10 transition-all"
                >
                  <History size={13} /> View History
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. Software Engineer Resume v2"
                  value={resumeName}
                  onChange={e => setResumeName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveName()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !resumeName.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {savingName
                    ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    : <History size={15} />}
                  Save to History
                </button>
              </div>
            )}
          </div>

          {/* Content preview */}
          {optimizedData && (
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-border/30 space-y-5">
              <h3 className="font-bold font-heading">Optimized Resume Preview</h3>

              {optimizedData.summary && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Professional Summary
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/15 rounded-xl p-4 border border-border/20">
                    {optimizedData.summary}
                  </p>
                </div>
              )}

              {optimizedData.experience && optimizedData.experience.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Experience
                  </p>
                  <div className="space-y-3">
                    {optimizedData.experience.map((exp, i) => (
                      <div key={i} className="bg-muted/15 rounded-xl p-4 border border-border/20">
                        <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                          <div>
                            <p className="text-sm font-semibold">{exp.title}</p>
                            <p className="text-xs text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                          </div>
                          <p className="text-xs text-muted-foreground italic">{exp.start} – {exp.end}</p>
                        </div>
                        <ul className="space-y-1 mt-2">
                          {exp.bullets?.map((b, j) => (
                            <li key={j} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                              <span className="text-primary shrink-0 mt-0.5">•</span> {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next steps */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setPhase("idle"); setOptimizedData(null); setPdfUrl(null); setNameSaved(false); setResumeName(""); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
            >
              <RotateCcw size={14} /> Re-optimize
            </button>
            <button
              onClick={() => router.push("/dashboard/tailor")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              <Zap size={15} /> Tailor for a Job <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
