"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useResumeStore } from "@/hooks/useResumeStore";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, TrendingUp, Zap,
  ArrowRight, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";

type ScoreData = {
  overall_score: number;
  breakdown: Record<string, { score: number; max: number; comment: string }>;
  strengths: string[];
  issues: string[];
  summary: string;
};

function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  const color = score >= 8.5 ? "#4ade80" : score >= 6.5 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold font-heading" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">out of 10</span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: { score: number; max: number; comment: string } }) {
  const [open, setOpen] = useState(false);
  const pct = (value.score / value.max) * 100;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/10 transition-colors"
      >
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        <span className="text-sm font-bold whitespace-nowrap">{value.score}/{value.max}</span>
        <div className="w-16 sm:w-24 h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-muted-foreground border-t border-border/20 pt-2">
          {value.comment}
        </div>
      )}
    </div>
  );
}

export default function CheckScorePage() {
  const router = useRouter();
  const { setResumeData, atsScore, scoreBreakdown, resumeId, extractedText } = useResumeStore();
  const [phase, setPhase] = useState<"upload" | "loading" | "result">("upload");
  const [loadingText, setLoadingText] = useState("Uploading PDF...");
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);

  // Restore state from store if available
  useEffect(() => {
    if (atsScore !== null && scoreBreakdown) {
      setScoreData(scoreBreakdown);
      setPhase("result");
    }
  }, [atsScore, scoreBreakdown]);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    try {
      setPhase("loading");
      setLoadingText("Uploading and extracting PDF text...");

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      setResumeData({ resumeId: uploadData.resumeId, extractedText: uploadData.extractedText });
      setLoadingText("Analyzing ATS compatibility with AI...");

      const scoreRes = await fetch("/api/resume/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: uploadData.resumeId }),
      });
      const scoredData = await scoreRes.json();
      if (!scoreRes.ok) throw new Error(scoredData.error);

      setResumeData({ atsScore: scoredData.scoreData.overall_score, scoreBreakdown: scoredData.scoreData });
      setScoreData(scoredData.scoreData);
      setPhase("result");
      toast.success("ATS score calculated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze resume");
      setPhase("upload");
    }
  }, [setResumeData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: phase === "loading",
  });

  const getScoreLabel = (s: number) =>
    s >= 9 ? "Excellent" : s >= 7.5 ? "Good" : s >= 5 ? "Fair" : "Poor";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight">Check ATS Score</h1>
        <p className="text-muted-foreground mt-1">
          Upload your resume to see how recruiter software reads it.
        </p>
      </div>

      {/* Upload Phase */}
      {phase === "upload" && (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-all group ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border/40 hover:border-primary/50 hover:bg-muted/10"
          }`}
        >
          <input {...getInputProps()} id="resume-upload-input" />
          <div className="mx-auto w-20 h-20 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="text-lg font-bold font-heading mb-2">
            {isDragActive ? "Drop your resume here" : "Upload your resume"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Drag and drop or click to select — PDF only, max 10MB
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            <FileText size={15} /> Select PDF File
          </div>
        </div>
      )}

      {/* Loading Phase */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-28 space-y-5 animate-fade-scale">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <h3 className="text-xl font-bold font-heading">{loadingText}</h3>
          <p className="text-muted-foreground text-sm">This typically takes 10–25 seconds.</p>
        </div>
      )}

      {/* Result Phase */}
      {phase === "result" && scoreData && (
        <div className="space-y-8 animate-slide-up">
          {/* Score + Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Left: Score Ring */}
            <div className="glass-card rounded-2xl p-6 neon-border flex flex-col items-center justify-center gap-4">
              <ScoreRing score={scoreData.overall_score} />
              <div className="text-center">
                <p className="font-bold font-heading text-lg">
                  {getScoreLabel(scoreData.overall_score)}
                </p>
                <p className="text-xs text-muted-foreground">ATS Compatibility</p>
              </div>
              {scoreData.overall_score < 9.5 && (
                <button
                  onClick={() => router.push("/dashboard/optimize")}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  <Zap size={15} /> Optimize Score
                </button>
              )}
              {scoreData.overall_score >= 9.5 && (
                <button
                  onClick={() => router.push("/dashboard/tailor")}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/90 transition-all"
                >
                  <ArrowRight size={15} /> Tailor for Jobs
                </button>
              )}
            </div>

            {/* Right: Summary + Strengths / Issues */}
            <div className="md:col-span-2 space-y-4">
              {/* Summary */}
              <div className="glass-card rounded-2xl p-5 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-primary" />
                  <h3 className="font-semibold font-heading text-sm">AI Summary</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{scoreData.summary}</p>
              </div>

              {/* Strengths */}
              {scoreData.strengths?.length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <h3 className="font-semibold font-heading text-sm text-emerald-400">Strengths</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {scoreData.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-emerald-500 mt-0.5">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues */}
              {scoreData.issues?.length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-rose-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-rose-400" />
                    <h3 className="font-semibold font-heading text-sm text-rose-400">Issues to Fix</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {scoreData.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-rose-500 mt-0.5">✗</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          {scoreData.breakdown && Object.keys(scoreData.breakdown).length > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-border/30">
              <h3 className="font-bold font-heading text-base mb-4">Score Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(scoreData.breakdown).map(([key, val]) => (
                  <BreakdownRow
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={val}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Raw Text Editor */}
          <div className="glass-card rounded-2xl p-6 border border-border/30">
            <h3 className="font-bold font-heading text-base mb-2">Extracted Resume Text</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Review and edit the extracted text before optimizing. Ensure all key info is present.
            </p>
            <textarea
              className="w-full h-56 p-4 text-sm font-mono bg-muted/20 border border-border/40 rounded-xl focus:outline-none focus:border-primary/50 transition-all resize-none"
              value={extractedText || ""}
              onChange={(e) => setResumeData({ extractedText: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setPhase("upload"); setScoreData(null); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              <RotateCcw size={15} /> Upload new resume
            </button>
            <button
              onClick={() => router.push("/dashboard/optimize")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              <Zap size={15} /> Optimize Resume <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
