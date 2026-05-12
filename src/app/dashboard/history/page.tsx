"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText, Download, Target, Clock,
  ChevronDown, ChevronUp, TrendingUp, ExternalLink, BarChart3,
  Trash2, AlertTriangle, X,
} from "lucide-react";

type TailoredResume = {
  id: string;
  companyName: string | null;
  jobTitle: string | null;
  tailoredScore: number | null;
  pdfUrl: string | null;
  resumeName: string | null;
  createdAt: string;
};

type Resume = {
  id: string;
  atsScore: number | null;
  optimizedScore: number | null;
  originalFileUrl: string | null;
  optimizedPdfUrl: string | null;
  optimizedText: string | null;
  resumeName: string | null;
  createdAt: string;
  tailoredResumes: TailoredResume[];
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative z-10 glass-card rounded-2xl border border-rose-500/30 p-6 max-w-sm w-full shadow-2xl shadow-black/40 animate-fade-scale">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>
          <h3 className="font-bold font-heading text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (!score) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color =
    score >= 9.0 ? "bg-emerald-500/15 text-emerald-400" :
    score >= 6.5 ? "bg-amber-500/15 text-amber-400" :
                   "bg-rose-500/15 text-rose-400";
  return (
    <div className="text-center">
      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${color}`}>
        {score.toFixed(1)}/10
      </span>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ resumeId: string; label: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Show a resume card if the parent was named (after optimize) OR
  // if any tailored version under it was named (after tailor).
  const resumes = allResumes.filter(
    r => !!r.resumeName?.trim() || r.tailoredResumes.some(tr => !!tr.resumeName?.trim())
  );

  const loadHistory = async () => {
    try {
      const res  = await fetch("/api/user/history");
      const data = await res.json();
      if (res.ok) setAllResumes(data.resumes);
      else toast.error("Failed to load history");
    } catch {
      toast.error("Failed to load resume history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/resume/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: deleteTarget.resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Resume deleted from history");
      setAllResumes(prev => prev.filter(r => r.id !== deleteTarget.resumeId));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your resume history...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete Resume?"
          description={`This will permanently delete "${deleteTarget.label}" and all its tailored versions. This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">Resume History</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              All your optimized and tailored resumes in one place.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 border border-border/30 text-sm text-muted-foreground">
            <BarChart3 size={14} />
            {resumes.length} resume{resumes.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Empty state */}
        {resumes.length === 0 && (
          <div className="glass-card rounded-2xl p-12 sm:p-16 text-center border border-border/30">
            <FileText size={48} className="text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-heading mb-2">No named resumes yet</h3>
            <p className="text-muted-foreground text-sm mb-5">
              Optimize or tailor a resume and save it with a name to see it here.
            </p>
            <a
              href="/dashboard/check-score"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Check ATS Score
            </a>
          </div>
        )}

        {/* Resume cards */}
        {resumes.length > 0 && (
          <div className="space-y-4">
            {resumes.map((resume) => {
              const label =
                resume.resumeName ||
                resume.tailoredResumes.find(tr => tr.resumeName)?.resumeName ||
                "Unnamed Resume";

              return (
                <div
                  key={resume.id}
                  className="glass-card rounded-2xl border border-border/30 overflow-hidden"
                >
                  {/* ── Row ── */}
                  <div
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer hover:bg-muted/5 transition-colors flex-wrap"
                    onClick={() => toggle(resume.id)}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FileText size={17} className="text-primary" />
                    </div>

                    {/* Title + date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold font-heading">{label}</p>
                        {!resume.resumeName && resume.tailoredResumes.some(tr => tr.resumeName) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Tailored
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Clock size={10} />
                        {new Date(resume.createdAt).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <ScoreBadge score={resume.atsScore} label="Original" />
                      {resume.optimizedScore && (
                        <>
                          <TrendingUp size={14} className="text-emerald-400" />
                          <ScoreBadge score={resume.optimizedScore} label="Optimized" />
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {resume.originalFileUrl && (
                        <a
                          href={resume.originalFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View original upload"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
                        >
                          <ExternalLink size={11} /> <span className="hidden sm:inline">Original</span>
                        </a>
                      )}
                      {resume.optimizedPdfUrl && (
                        <a
                          href={resume.optimizedPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download optimized PDF"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
                        >
                          <Download size={11} /> PDF
                        </a>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={() => setDeleteTarget({ resumeId: resume.id, label })}
                        title="Delete from history"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs font-medium text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition-all"
                      >
                        <Trash2 size={11} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>

                    {/* Expand toggle */}
                    <div className="shrink-0 text-muted-foreground">
                      {expanded[resume.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {/* ── Expanded: tailored versions ── */}
                  {expanded[resume.id] && (
                    <div className="border-t border-border/20">
                      {resume.tailoredResumes.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Target size={13} />
                          No tailored versions yet.
                          <a href="/dashboard/tailor" className="text-primary hover:text-primary/80 ml-1 underline-offset-2 hover:underline">
                            Create one →
                          </a>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-3">
                            Tailored Versions ({resume.tailoredResumes.length})
                          </p>
                          {resume.tailoredResumes.map(tr => (
                            <div
                              key={tr.id}
                              className="flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-muted/10 border border-border/20 hover:border-border/40 transition-all flex-wrap"
                            >
                              <Target size={13} className="text-emerald-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {tr.resumeName || (tr.jobTitle
                                    ? `${tr.jobTitle}${tr.companyName ? ` at ${tr.companyName}` : ""}`
                                    : "Untitled Role")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tr.jobTitle && tr.resumeName ? `${tr.jobTitle}${tr.companyName ? ` at ${tr.companyName}` : ""}  · ` : ""}
                                  {new Date(tr.createdAt).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric", year: "numeric",
                                  })}
                                </p>
                              </div>
                              {tr.tailoredScore && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                                  {tr.tailoredScore.toFixed(1)}/10
                                </span>
                              )}
                              {tr.pdfUrl && (
                                <a
                                  href={tr.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                >
                                  <Download size={11} /> PDF
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
