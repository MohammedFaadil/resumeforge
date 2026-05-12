import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BarChart3, TrendingUp, Users, FileText, Target, Sparkles } from "lucide-react";

export default async function AnalyticsPage() {
  const [
    totalUsers,
    approvedUsers,
    pendingUsers,
    totalResumes,
    scoredResumes,
    optimizedResumes,
    tailoredResumes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.resume.count(),
    prisma.resume.count({ where: { atsScore: { not: null } } }),
    prisma.resume.count({ where: { optimizedText: { not: null } } }),
    prisma.tailoredResume.count(),
  ]);

  const avgAtsScore = await prisma.resume.aggregate({
    _avg: { atsScore: true },
    where: { atsScore: { not: null } },
  });

  const avgOptimizedScore = await prisma.resume.aggregate({
    _avg: { optimizedScore: true },
    where: { optimizedScore: { not: null } },
  });

  const stats = [
    { label: "Total Users", value: totalUsers, sub: `${approvedUsers} active`, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/15" },
    { label: "Pending Approvals", value: pendingUsers, sub: "Awaiting review", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/15" },
    { label: "Total Resumes", value: totalResumes, sub: `${scoredResumes} scored`, icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/15" },
    { label: "Optimized Resumes", value: optimizedResumes, sub: `${((optimizedResumes / (totalResumes || 1)) * 100).toFixed(0)}% of all`, icon: Sparkles, color: "text-primary", bg: "bg-primary/10 border-primary/15" },
    { label: "Tailored Resumes", value: tailoredResumes, sub: "Job-specific versions", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
    {
      label: "Avg Original ATS Score",
      value: avgAtsScore._avg.atsScore ? `${avgAtsScore._avg.atsScore.toFixed(1)}/10` : "N/A",
      sub: "Before optimization",
      icon: BarChart3,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/15"
    },
    {
      label: "Avg Optimized Score",
      value: avgOptimizedScore._avg.optimizedScore ? `${avgOptimizedScore._avg.optimizedScore.toFixed(1)}/10` : "N/A",
      sub: "After optimization",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/15"
    },
  ];

  const conversionRate = totalResumes > 0 ? ((optimizedResumes / totalResumes) * 100).toFixed(1) : "0";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">Overview of platform usage and performance metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`glass-card rounded-2xl p-5 border ${bg}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <p className={`text-3xl font-extrabold font-heading ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      <div className="glass-card rounded-2xl p-6 border border-border/30">
        <h3 className="font-bold font-heading mb-5">Optimization Funnel</h3>
        <div className="space-y-4">
          {[
            { label: "Resumes Uploaded", count: totalResumes, color: "bg-cyan-500", pct: 100 },
            { label: "Resumes Scored", count: scoredResumes, color: "bg-primary", pct: totalResumes ? (scoredResumes / totalResumes) * 100 : 0 },
            { label: "Resumes Optimized", count: optimizedResumes, color: "bg-emerald-500", pct: totalResumes ? (optimizedResumes / totalResumes) * 100 : 0 },
            { label: "Tailored Versions", count: tailoredResumes, color: "bg-amber-500", pct: totalResumes ? Math.min((tailoredResumes / totalResumes) * 100, 100) : 0 },
          ].map(({ label, count, color, pct }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          <strong className="text-foreground">{conversionRate}%</strong> of uploaded resumes are optimized.
        </p>
      </div>
    </div>
  );
}
