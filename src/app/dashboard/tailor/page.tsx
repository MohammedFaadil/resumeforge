"use client";

import { useState, useEffect } from "react";
import { useResumeStore } from "@/hooks/useResumeStore";
import { toast } from "sonner";
import {
  Target, Download, RotateCcw, CheckCircle2,
  XCircle, Lightbulb, AlertTriangle, FileSearch, Building2, Briefcase,
  FileText, Copy, Check, Sparkles, ChevronDown, ChevronUp,
  Tag, History, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type AnalysisResult = {
  analysis: { matched: string[]; missing: string[]; suggested_additions: string[] };
  estimatedScore: number;
  pdfUrl: string;
  tailoredResumeId: string;
};

type CoverLetterResult = {
  coverLetter: string;
  subjectLine: string;
  keySellingPoints: string[];
};

export default function TailorPage() {
  const router = useRouter();
  const { 
    resumeId, 
    jobTitle, setResumeData, 
    companyName, 
    jobDescription, 
    tailorResult 
  } = useResumeStore();
  
  const [phase, setPhase]               = useState<"form" | "loading" | "result">("form");
  const [result, setResult]             = useState<AnalysisResult | null>(null);

  // Restore state from store if available
  useEffect(() => {
    if (tailorResult) {
      setResult(tailorResult);
      setPhase("result");
    }
  }, [tailorResult]);

  // Cover letter state
  const [clPhase, setClPhase]           = useState<"idle" | "loading" | "done">("idle");
  const [coverLetter, setCoverLetter]   = useState<CoverLetterResult | null>(null);
  const [editedLetter, setEditedLetter] = useState("");   // editable copy
  const [copied, setCopied]             = useState(false);
  const [clExpanded, setClExpanded]     = useState(true);

  // Save name state
  const [tailoredName, setTailoredName] = useState("");
  const [nameSaved, setNameSaved]       = useState(false);
  const [savingName, setSavingName]     = useState(false);

  const noResume = !resumeId;

  const handleTailor = async () => {
    if (!jobDescription.trim()) { toast.error("Please paste a job description"); return; }
    try {
      setPhase("loading");
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobTitle, companyName, jobDescription }),
      });
      const data = await res.json();
      if (res.status === 429) {
        toast.error(data.error || "Daily AI token limit reached. Please try again later.", { duration: 8000 });
        setPhase("form");
        return;
      }
      if (!res.ok) throw new Error(data.error);
      
      setResumeData({ tailorResult: data });
      setResult(data);
      setPhase("result");
      setCoverLetter(null);
      setClPhase("idle");
      setNameSaved(false);
      setTailoredName("");
      toast.success("Resume tailored successfully!");
    } catch (err: any) {
      toast.error(err.message || "Tailoring failed");
      setPhase("form");
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!result?.tailoredResumeId) { toast.error("Tailor your resume first"); return; }
    try {
      setClPhase("loading");
      setClExpanded(true);
      const res = await fetch("/api/resume/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResumeId: result.tailoredResumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoverLetter(data);
      setEditedLetter(data.coverLetter || "");  // initialize editable copy
      setClPhase("done");
      toast.success("Cover letter generated!");
    } catch (err: any) {
      toast.error(err.message || "Cover letter generation failed");
      setClPhase("idle");
    }
  };

  const handleCopy = async () => {
    const textToCopy = editedLetter || coverLetter?.coverLetter || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Cover letter copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy — please select and copy manually");
    }
  };

  const [clDownloading, setClDownloading] = useState(false);

  const handleDownloadCoverLetterPdf = async () => {
    const text = editedLetter || coverLetter?.coverLetter || '';
    if (!text) { toast.error("No cover letter to download"); return; }
    setClDownloading(true);
    try {
      const res = await fetch("/api/resume/cover-letter-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetterText: text, candidateName: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF generation failed");
      window.open(data.pdfUrl, "_blank");
      toast.success("Cover letter PDF ready!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate cover letter PDF");
    } finally {
      setClDownloading(false);
    }
  };

  const handleSaveTailoredName = async () => {
    if (!result?.tailoredResumeId || !tailoredName.trim()) { toast.error("Enter a name first"); return; }
    setSavingName(true);
    try {
      const res = await fetch("/api/resume/save-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResumeId: result.tailoredResumeId, resumeName: tailoredName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNameSaved(true);
      toast.success("Saved to history!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingName(false);
    }
  };

  const getScoreColor = (s: number) =>
    s >= 9.5 ? "text-emerald-400" : s >= 8 ? "text-amber-400" : "text-rose-400";


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">Tailor for Job</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Paste a job description and get a perfectly matched resume + cover letter.
        </p>
      </div>

      {/* No resume */}
      {noResume && (
        <div className="glass-card rounded-2xl p-10 sm:p-16 border border-amber-500/20 text-center flex flex-col items-center justify-center min-h-[300px]">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold font-heading mb-2">Upload a Resume First</h3>
          <p className="text-muted-foreground text-sm mb-5">
            You need to check your ATS score before tailoring.
          </p>
          <button
            onClick={() => router.push("/dashboard/check-score")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <FileSearch size={16} /> Check ATS Score First
          </button>
        </div>
      )}

      {/* Form */}
      {!noResume && phase === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-border/30 space-y-4">
              <h3 className="font-bold font-heading">Job Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Briefcase size={12} /> Job Title
                  </label>
                  <input
                    type="text" placeholder="Software Engineer"
                    value={jobTitle} onChange={e => setResumeData({ jobTitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 size={12} /> Company
                  </label>
                  <input
                    type="text" placeholder="Google"
                    value={companyName} onChange={e => setResumeData({ companyName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Job Description *
                </label>
                <textarea
                  rows={12}
                  placeholder="Paste the full job description here including responsibilities, requirements, and qualifications..."
                  value={jobDescription}
                  onChange={e => setResumeData({ jobDescription: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {jobDescription.length} characters · More detail = better results
                </p>
              </div>
              <button
                onClick={handleTailor}
                disabled={!jobDescription.trim()}
                id="tailor-submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-all hover:shadow-xl hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Target size={18} /> Tailor My Resume for This Job
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-emerald-500/15">
              <h4 className="font-bold font-heading text-sm mb-3 text-emerald-400">What We Do</h4>
              <ul className="space-y-2.5">
                {[
                  "Extract keywords from the JD",
                  "Match your existing skills",
                  "Reframe experience to match",
                  "Score ATS compatibility (9.5+)",
                  "Generate tailored PDF",
                  "Write a personalized cover letter",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-amber-400">Ethics Notice:</strong> We only highlight your real skills and truthfully reframe your genuine experience. No fabrication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {!noResume && phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-24 space-y-5 animate-fade-scale">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Target size={24} className="absolute inset-0 m-auto text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold font-heading">Tailoring your resume...</h3>
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Analyzing the job description and matching your experience. Verifying ATS score above 9.5.
          </p>
        </div>
      )}

      {/* Result */}
      {!noResume && phase === "result" && result && (
        <div className="space-y-6 animate-slide-up">

          {/* Score + Actions */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="text-center sm:text-left">
                <p className={`text-5xl font-extrabold font-heading ${getScoreColor(result.estimatedScore)}`}>
                  {result.estimatedScore.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tailored ATS Score</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold font-heading mb-1 text-sm sm:text-base">
                  {jobTitle ? `${jobTitle}${companyName ? ` at ${companyName}` : ""}` : "Custom Job Application"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.analysis.matched.length} keywords matched · {result.analysis.missing.length} gaps found
                </p>
              </div>
              <div className="flex flex-col xs:flex-row gap-3">
                {result.pdfUrl && (
                  <a
                    href={result.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                  >
                    <Download size={15} /> Download PDF
                  </a>
                )}
                <button
                  onClick={() => { setPhase("form"); setResumeData({ tailorResult: null }); setCoverLetter(null); setClPhase("idle"); }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted/20 transition-all"
                >
                  <RotateCcw size={15} /> Tailor Again
                </button>
              </div>
            </div>
          </div>

          {/* ── Save to History ── */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Tag size={17} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-heading text-sm">Save to History</h3>
                <p className="text-xs text-muted-foreground">Give this tailored resume a name so you can find it easily later.</p>
              </div>
            </div>
            {nameSaved ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={16} />
                <span>Saved as <strong>"{tailoredName}"</strong> in your history.</span>
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
                  placeholder={`e.g. ${jobTitle || "Software Engineer"} at ${companyName || "Google"}`}
                  value={tailoredName}
                  onChange={e => setTailoredName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveTailoredName()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  onClick={handleSaveTailoredName}
                  disabled={savingName || !tailoredName.trim()}
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

          {/* Keyword Analysis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Matched */}
            <div className="glass-card rounded-2xl p-5 border border-emerald-500/15">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h4 className="font-bold font-heading text-sm text-emerald-400">Matched Keywords</h4>
                <span className="ml-auto text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{result.analysis.matched.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {result.analysis.matched.map((k, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{k}</span>
                ))}
              </div>
            </div>

            {/* Missing */}
            <div className="glass-card rounded-2xl p-5 border border-rose-500/15">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={16} className="text-rose-400" />
                <h4 className="font-bold font-heading text-sm text-rose-400">Missing Keywords</h4>
                <span className="ml-auto text-xs bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded-full">{result.analysis.missing.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {result.analysis.missing.map((k, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">{k}</span>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="glass-card rounded-2xl p-5 border border-amber-500/15 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-amber-400" />
                <h4 className="font-bold font-heading text-sm text-amber-400">Suggestions</h4>
              </div>
              <ul className="space-y-2">
                {result.analysis.suggested_additions?.slice(0, 5).map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Cover Letter Section ─────────────────────────────────────── */}
          <div className="glass-card rounded-2xl border border-primary/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/30 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold font-heading text-sm sm:text-base">Cover Letter Generator</h3>
                  <p className="text-xs text-muted-foreground">Personalized from your resume &amp; job description</p>
                </div>
              </div>
              {coverLetter && (
                <button
                  onClick={() => setClExpanded(!clExpanded)}
                  className="p-2 rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground"
                >
                  {clExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Generate button */}
              {clPhase === "idle" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <p className="text-sm text-muted-foreground flex-1">
                    Generate a tailored, professional cover letter for{" "}
                    <strong className="text-foreground">{jobTitle || "this role"}</strong>
                    {companyName ? <> at <strong className="text-foreground">{companyName}</strong></> : ""}.
                  </p>
                  <button
                    onClick={handleGenerateCoverLetter}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Sparkles size={16} /> Generate Cover Letter
                  </button>
                </div>
              )}

              {/* Loading state */}
              {clPhase === "loading" && (
                <div className="flex items-center gap-4 py-4">
                  <Loader2 size={22} className="text-primary animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Writing your cover letter...</p>
                    <p className="text-xs text-muted-foreground">Crafting personalized content from your resume and the job description.</p>
                  </div>
                </div>
              )}

              {/* Result */}
              {clPhase === "done" && coverLetter && clExpanded && (
                <div className="space-y-4">
                  {/* Subject line */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Subject:</span>
                    <span className="text-sm font-medium flex-1 break-words">{coverLetter.subjectLine}</span>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(coverLetter.subjectLine);
                        toast.success("Subject line copied!");
                      }}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy subject line"
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  {/* Key selling points */}
                  {coverLetter.keySellingPoints?.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Key Selling Points</p>
                      <ul className="space-y-1.5">
                        {coverLetter.keySellingPoints.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" /> {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Letter body */}
                  <div className="relative">
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copied
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/60"
                        }`}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    {/* Editable label */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-xs text-muted-foreground/60 select-none pointer-events-none">
                      <span>✏</span>
                      <span>Editable — make changes before copying</span>
                    </div>
                    <textarea
                      value={editedLetter}
                      onChange={e => setEditedLetter(e.target.value)}
                      rows={16}
                      spellCheck
                      className="w-full px-4 pt-4 pb-9 pr-24 text-sm bg-muted/15 border border-primary/20 rounded-xl resize-y focus:outline-none focus:border-primary/40 transition-all font-sans leading-relaxed text-foreground"
                      placeholder="Cover letter content..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right -mt-1">{editedLetter.length} characters</p>

                  {/* Action row */}
                  <div className="flex flex-col xs:flex-row gap-3">
                    <button
                      onClick={handleCopy}
                      className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                        copied
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied to Clipboard!" : "Copy Cover Letter"}
                    </button>
                    <button
                      onClick={handleDownloadCoverLetterPdf}
                      disabled={clDownloading}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20"
                    >
                      {clDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      Download PDF
                    </button>
                    <button
                      onClick={() => { setClPhase("idle"); setCoverLetter(null); setEditedLetter(""); }}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
                    >
                      <RotateCcw size={14} /> Regenerate
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsed state indicator */}
              {clPhase === "done" && coverLetter && !clExpanded && (
                <button
                  onClick={() => setClExpanded(true)}
                  className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronDown size={16} /> Show Cover Letter
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
