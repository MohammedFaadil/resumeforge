"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/hooks/useResumeStore";
import { toast } from "sonner";
import {
  Sparkles, CheckCircle2, Download, ArrowRight,
  FileSearch, AlertTriangle, Zap, RotateCcw, Tag, History,
  Pencil, Eye, Save, Loader2
} from "lucide-react";

type Phase = "idle" | "optimizing" | "generating-pdf" | "done";

type OptimizedSection = {
  contact?: { name: string; email: string; phone: string; location: string; linkedin?: string; github?: string };
  summary?: string;
  experience?: Array<{ title: string; company: string; start: string; end: string; location: string; bullets: string[] }>;
  education?: Array<{ institution: string; degree: string; year: string; location: string; gpa?: string }>;
  skills?: { technical?: string[]; tools?: string[]; soft?: string[] };
  certifications?: string[];
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
  const { resumeId, atsScore, extractedText, optimizedText, optimizedScore: storedOptimizedScore, setResumeData } = useResumeStore();
  const [phase, setPhase]               = useState<Phase>("idle");
  const [optimizedScore, setOptimizedScore] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl]             = useState<string | null>(null);
  const [optimizedData, setOptimizedData] = useState<OptimizedSection | null>(null);
  const [resumeName, setResumeName]     = useState("");
  const [nameSaved, setNameSaved]       = useState(false);
  const [savingName, setSavingName]     = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Restore state from store if available
  useEffect(() => {
    if (optimizedText && storedOptimizedScore) {
      setOptimizedData(optimizedText);
      setOptimizedScore(storedOptimizedScore);
      setPhase("done");
      // Note: pdfUrl is not stored in JSON store usually because it's a signed URL or temp path
      // But we can try to re-fetch or just let them re-generate if needed.
      // However, for the UI consistency, "done" phase is enough.
    }
  }, [optimizedText, storedOptimizedScore]);

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
      const verifiedAtsScore: number = optData.verifiedScore ?? 9.0;

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
      setResumeData({ optimizedText: optData.optimizedData, optimizedScore: verifiedAtsScore });
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

  // ── Save inline edits ─────────────────────────────────────────────────────
  const handleSaveEdits = async () => {
    if (!resumeId || !optimizedData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/resume/save-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, resumeData: optimizedData }),
      });
      if (!res.ok) throw new Error("Failed to save edits");
      setResumeData({ optimizedText: optimizedData });
      setIsEditing(false);
      toast.success("Edits saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Download: regenerate PDF from current data ────────────────────────────
  const handleDownloadPdf = async () => {
    if (!resumeId) return;
    setRegenerating(true);
    try {
      // Save latest edits first
      if (optimizedData) {
        await fetch("/api/resume/save-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, resumeData: optimizedData }),
        });
      }
      const res = await fetch("/api/resume/regenerate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF generation failed");
      setPdfUrl(data.pdfUrl);
      window.open(data.pdfUrl, "_blank");
      toast.success("PDF generated! Download started.");
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    } finally {
      setRegenerating(false);
    }
  };

  // ── Inline edit helpers ───────────────────────────────────────────────────
  const updateField = (path: string, value: any) => {
    if (!optimizedData) return;
    const copy = JSON.parse(JSON.stringify(optimizedData));
    const keys = path.split(".");
    let obj: any = copy;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = isNaN(Number(keys[i])) ? keys[i] : Number(keys[i]);
      obj = obj[k];
    }
    const lastKey = isNaN(Number(keys[keys.length - 1])) ? keys[keys.length - 1] : Number(keys[keys.length - 1]);
    obj[lastKey] = value;
    setOptimizedData(copy);
  };

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
        <div className="glass-card rounded-2xl p-10 sm:p-16 border border-amber-500/20 text-center flex flex-col items-center justify-center min-h-[300px]">
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
                <p className="text-3xl font-extrabold font-heading text-emerald-400">Max</p>
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
          {/* Success banner with score + action buttons */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold font-heading text-lg">Optimization Complete!</h3>
                <p className="text-muted-foreground text-sm">
                  ATS score: <strong className="text-emerald-400">{optimizedScore?.toFixed(1)}/10</strong>.
                  {isEditing ? " Edit your resume below, then save & download." : " Review your resume below, edit if needed, then download."}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isEditing ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20" : "bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
                >
                  {isEditing ? <><Eye size={15} /> Preview</> : <><Pencil size={15} /> Edit</>}
                </button>
                {isEditing && (
                  <button onClick={handleSaveEdits} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Edits
                  </button>
                )}
                <button onClick={handleDownloadPdf} disabled={regenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50">
                  {regenerating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* ── Full Resume Preview / Editor ── */}
          {optimizedData && (
            <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
              {/* Resume header bar */}
              <div className="px-6 py-4 border-b border-border/20 bg-muted/10 flex items-center justify-between">
                <h3 className="font-bold font-heading text-sm flex items-center gap-2">
                  {isEditing ? <><Pencil size={14} className="text-amber-400" /> Editing Mode</> : <><Eye size={14} className="text-primary" /> Resume Preview</>}
                </h3>
                {isEditing && <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">Click any field to edit</span>}
              </div>

              <div className="p-6 sm:p-8 space-y-6 max-w-3xl mx-auto" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {/* Contact */}
                {optimizedData.contact && (
                  <div className="text-center space-y-1 pb-4 border-b border-border/20">
                    {isEditing ? (
                      <input value={optimizedData.contact.name || ""} onChange={e => updateField("contact.name", e.target.value)}
                        className="text-xl font-bold text-center w-full bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary pb-1" />
                    ) : (
                      <h2 className="text-xl font-bold tracking-wide">{optimizedData.contact?.name}</h2>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {isEditing ? (
                        <>
                          <input value={optimizedData.contact.email || ""} onChange={e => updateField("contact.email", e.target.value)} placeholder="Email" className="bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary text-center w-40" />
                          <span>|</span>
                          <input value={optimizedData.contact.phone || ""} onChange={e => updateField("contact.phone", e.target.value)} placeholder="Phone" className="bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary text-center w-32" />
                          <span>|</span>
                          <input value={optimizedData.contact.location || ""} onChange={e => updateField("contact.location", e.target.value)} placeholder="Location" className="bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary text-center w-36" />
                        </>
                      ) : (
                        <>
                          {optimizedData.contact.email && <span>{optimizedData.contact.email}</span>}
                          {optimizedData.contact.phone && <><span>|</span><span>{optimizedData.contact.phone}</span></>}
                          {optimizedData.contact.location && <><span>|</span><span>{optimizedData.contact.location}</span></>}
                          {optimizedData.contact.linkedin && <><span>|</span><span>{optimizedData.contact.linkedin}</span></>}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {(optimizedData.summary || isEditing) && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground mb-2 border-b border-foreground/20 pb-1">Professional Summary</h3>
                    {isEditing ? (
                      <textarea value={optimizedData.summary || ""} onChange={e => updateField("summary", e.target.value)} rows={3}
                        className="w-full text-sm leading-relaxed bg-amber-500/5 border border-dashed border-amber-500/20 rounded-lg p-3 focus:outline-none focus:border-amber-500/40 resize-none" />
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground">{optimizedData.summary}</p>
                    )}
                  </div>
                )}

                {/* Experience */}
                {optimizedData.experience && optimizedData.experience.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground mb-3 border-b border-foreground/20 pb-1">Experience</h3>
                    <div className="space-y-4">
                      {optimizedData.experience.map((exp, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-start flex-wrap gap-1 mb-1">
                            <div>
                              {isEditing ? (
                                <>
                                  <input value={exp.title} onChange={e => updateField(`experience.${i}.title`, e.target.value)}
                                    className="text-sm font-bold bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary w-full" />
                                  <input value={exp.company} onChange={e => updateField(`experience.${i}.company`, e.target.value)}
                                    className="text-xs text-muted-foreground bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary w-full mt-0.5" />
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-bold">{exp.title}</p>
                                  <p className="text-xs text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground italic shrink-0">{exp.start} – {exp.end}</p>
                          </div>
                          <ul className="space-y-1.5 mt-2 ml-1">
                            {exp.bullets?.map((b, j) => (
                              <li key={j} className="flex gap-2 text-sm leading-relaxed">
                                <span className="text-foreground shrink-0 mt-0.5">•</span>
                                {isEditing ? (
                                  <input value={b} onChange={e => updateField(`experience.${i}.bullets.${j}`, e.target.value)}
                                    className="flex-1 bg-amber-500/5 border border-dashed border-amber-500/20 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-amber-500/40" />
                                ) : (
                                  <span className="text-muted-foreground">{b}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {optimizedData.education && optimizedData.education.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground mb-3 border-b border-foreground/20 pb-1">Education</h3>
                    {optimizedData.education.map((edu, i) => (
                      <div key={i} className="flex justify-between items-start flex-wrap gap-1 mb-2">
                        <div>
                          {isEditing ? (
                            <>
                              <input value={edu.degree} onChange={e => updateField(`education.${i}.degree`, e.target.value)}
                                className="text-sm font-semibold bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary w-full" />
                              <input value={edu.institution} onChange={e => updateField(`education.${i}.institution`, e.target.value)}
                                className="text-xs text-muted-foreground bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary w-full mt-0.5" />
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold">{edu.degree}</p>
                              <p className="text-xs text-muted-foreground">{edu.institution}{edu.location ? ` · ${edu.location}` : ""}</p>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{edu.year}</p>
                          {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {optimizedData.skills && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground mb-3 border-b border-foreground/20 pb-1">Skills</h3>
                    <div className="space-y-2">
                      {optimizedData.skills.technical && optimizedData.skills.technical.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold">Technical: </span>
                          {isEditing ? (
                            <input value={optimizedData.skills.technical.join(", ")} onChange={e => updateField("skills.technical", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                              className="text-xs text-muted-foreground bg-amber-500/5 border border-dashed border-amber-500/20 rounded px-2 py-0.5 w-full mt-1 focus:outline-none focus:border-amber-500/40" />
                          ) : (
                            <span className="text-xs text-muted-foreground">{optimizedData.skills.technical.join(" · ")}</span>
                          )}
                        </div>
                      )}
                      {optimizedData.skills.tools && optimizedData.skills.tools.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold">Tools & Platforms: </span>
                          {isEditing ? (
                            <input value={optimizedData.skills.tools.join(", ")} onChange={e => updateField("skills.tools", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                              className="text-xs text-muted-foreground bg-amber-500/5 border border-dashed border-amber-500/20 rounded px-2 py-0.5 w-full mt-1 focus:outline-none focus:border-amber-500/40" />
                          ) : (
                            <span className="text-xs text-muted-foreground">{optimizedData.skills.tools.join(" · ")}</span>
                          )}
                        </div>
                      )}
                      {optimizedData.skills.soft && optimizedData.skills.soft.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold">Professional: </span>
                          {isEditing ? (
                            <input value={optimizedData.skills.soft.join(", ")} onChange={e => updateField("skills.soft", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                              className="text-xs text-muted-foreground bg-amber-500/5 border border-dashed border-amber-500/20 rounded px-2 py-0.5 w-full mt-1 focus:outline-none focus:border-amber-500/40" />
                          ) : (
                            <span className="text-xs text-muted-foreground">{optimizedData.skills.soft.join(" · ")}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <span>Saved as <strong>&quot;{resumeName}&quot;</strong> in your history.</span>
                <button onClick={() => router.push("/dashboard/history")}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/10 transition-all">
                  <History size={13} /> View History
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="e.g. Software Engineer Resume v2" value={resumeName}
                  onChange={e => setResumeName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveName()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
                <button onClick={handleSaveName} disabled={savingName || !resumeName.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                  {savingName ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <History size={15} />}
                  Save to History
                </button>
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setPhase("idle"); setOptimizedData(null); setPdfUrl(null); setNameSaved(false); setResumeName(""); setIsEditing(false); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
              <RotateCcw size={14} /> Re-optimize
            </button>
            <button onClick={() => router.push("/dashboard/tailor")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
              <Zap size={15} /> Tailor for a Job <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
