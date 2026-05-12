import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Users, Clock, CheckCircle2, XCircle, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);

  const [totalUsers, pendingUsers, approvedUsers, rejectedUsers, totalResumes] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { status: "REJECTED" } }),
    prisma.resume.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/15" },
    { label: "Pending Approval", value: pendingUsers, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/15" },
    { label: "Approved Users", value: approvedUsers, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
    { label: "Total Resumes", value: totalResumes, icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/15" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name?.split(" ")[0]}. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`glass-card rounded-2xl p-5 border ${bg} flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className={`text-3xl font-extrabold font-heading ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-6 border border-amber-500/15 bg-amber-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-400" />
              <h3 className="font-bold font-heading">Pending Approvals</h3>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-semibold">
              {pendingUsers} waiting
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {pendingUsers === 0 ? "No pending approvals. All caught up!" : `${pendingUsers} user${pendingUsers > 1 ? "s" : ""} waiting for approval.`}
          </p>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Manage Users <ArrowRight size={14} />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-violet-500/15 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-violet-400" />
            <h3 className="font-bold font-heading">Create New User</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manually create user accounts and set their access level without requiring signup approval.
          </p>
          <Link
            href="/admin/create-user"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create User <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Recent Users */}
      <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
        <div className="p-6 border-b border-border/30 flex items-center justify-between">
          <h3 className="font-bold font-heading">Recent Signups</h3>
          <Link href="/admin/users" className="text-xs text-primary hover:text-primary/80 transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                {["Name", "Email", "Status", "Joined"].map(h => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-muted-foreground text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id} className="border-t border-border/20">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                      u.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-400" :
                      u.status === "REJECTED" ? "bg-rose-500/15 text-rose-400" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {u.status === "APPROVED" ? <CheckCircle2 size={11} /> : u.status === "REJECTED" ? <XCircle size={11} /> : <Clock size={11} />}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
