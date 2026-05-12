"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText, Download, Target, Clock, Search,
  ChevronDown, ChevronUp, TrendingUp, ExternalLink,
  Trash2, AlertTriangle, X, RefreshCw, Users, BarChart3,
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
  resumeName: string | null;
  createdAt: string;
  tailoredResumes: TailoredResume[];
  user: { id: string; name: string; email: string };
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDeleteDialog({
  title, description, onConfirm, onCancel, loading,
}: {
  title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 glass-card rounded-2xl border border-rose-500/30 p-6 max-w-sm w-full shadow-2xl shadow-black/40 animate-fade-scale">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>
          <h3 className="font-bold font-heading text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
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

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (!score) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color =
    score >= 9.0 ? "bg-emerald-500/15 text-emerald-400" :
    score >= 6.5 ? "bg-amber-500/15 text-amber-400" :
                   "bg-rose-500/15 text-rose-400";
  return (
    <div className="text-center">
      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${color}`}>{score.toFixed(1)}/10</span>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminResumesPage() {
  const [resumes, setResumes]   = useState<Resume[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch]     = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ resumeId: string; label: string; userName: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/admin/resumes");
      const data = await res.json();
      if (res.ok) setResumes(data.resumes);
      else toast.error("Failed to load resumes");
    } catch {
      toast.error("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

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
      toast.success("Resume deleted successfully");
      setResumes(prev => prev.filter(r => r.id !== deleteTarget.resumeId));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = resumes.filter(r =>
    r.user.name.toLowerCase().includes(search.toLowerCase()) ||
    r.user.email.toLowerCase().includes(search.toLowerCase()) ||
    (r.resumeName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete Resume?"
          description={`Delete "${deleteTarget.label}" belonging to ${deleteTarget.userName}? This will also delete all tailored versions. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-heading tracking-tight">Resume Management</h1>
            <p className="text-muted-foreground mt-1">
              View and delete any user's resume history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 border border-border/30 text-sm text-muted-foreground">
              <BarChart3 size={14} /> {resumes.length} total
            </div>
            <button
              onClick={fetchResumes}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user name, email, or resume name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center border border-border/30">
            <FileText size={48} className="text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-heading mb-2">
              {search ? "No resumes match your search" : "No resumes found"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term." : "No users have uploaded any resumes yet."}
            </p>
          </div>
        )}

        {/* Resume cards */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(resume => {
              const label = resume.resumeName || `Resume uploaded ${new Date(resume.createdAt).toLocaleDateString()}`;
              return (
                <div key={resume.id} className="glass-card rounded-2xl border border-border/30 overflow-hidden">
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer hover:bg-muted/5 transition-colors flex-wrap"
                    onClick={() => toggle(resume.id)}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <FileText size={17} className="text-violet-400" />
                    </div>

                    {/* Title + user */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold font-heading truncate">{label}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users size={10} /> {resume.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-50">·</span>
                        <span className="text-xs text-muted-foreground">{resume.user.email}</span>
                        <span className="text-xs text-muted-foreground opacity-50">·</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={10} />
                          {new Date(resume.createdAt).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreBadge score={resume.atsScore} label="Original" />
                      {resume.optimizedScore && (
                        <>
                          <TrendingUp size={14} className="text-emerald-400" />
                          <ScoreBadge score={resume.optimizedScore} label="Optimized" />
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {resume.originalFileUrl && (
                        <a
                          href={resume.originalFileUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                        >
                          <ExternalLink size={11} /> Original
                        </a>
                      )}
                      {resume.optimizedPdfUrl && (
                        <a
                          href={resume.optimizedPdfUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
                        >
                          <Download size={11} /> PDF
                        </a>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ resumeId: resume.id, label, userName: resume.user.name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs font-medium text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition-all"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>

                    {/* Expand */}
                    <div className="shrink-0 text-muted-foreground">
                      {expanded[resume.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {/* Expanded tailored versions */}
                  {expanded[resume.id] && (
                    <div className="border-t border-border/20">
                      {resume.tailoredResumes.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Target size={13} /> No tailored versions.
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-3">
                            Tailored Versions ({resume.tailoredResumes.length})
                          </p>
                          {resume.tailoredResumes.map(tr => (
                            <div
                              key={tr.id}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/10 border border-border/20 flex-wrap"
                            >
                              <Target size={13} className="text-emerald-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {tr.resumeName || (tr.jobTitle
                                    ? `${tr.jobTitle}${tr.companyName ? ` at ${tr.companyName}` : ""}`
                                    : "Untitled Role")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(tr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                                  target="_blank" rel="noopener noreferrer"
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
