"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, CheckCircle2, XCircle, Clock, Filter,
  MoreHorizontal, UserCheck, UserX, Trash2, RefreshCw,
  ChevronUp, ChevronDown
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APPROVED: { label: "Approved", color: "bg-emerald-500/15 text-emerald-400", icon: <CheckCircle2 size={11} /> },
  PENDING: { label: "Pending", color: "bg-amber-500/15 text-amber-400", icon: <Clock size={11} /> },
  REJECTED: { label: "Rejected", color: "bg-rose-500/15 text-rose-400", icon: <XCircle size={11} /> },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (userId: string, action: "approve-user" | "reject-user") => {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast.success(`User ${action === "approve-user" ? "approved" : "rejected"} successfully`);
        fetchUsers();
      } else {
        toast.error("Action failed");
      }
    } catch { toast.error("An error occurred"); }
    finally { setLoadingId(null); setOpenMenu(null); }
  };

  const filtered = users
    .filter(u => filter === "ALL" || u.status === filter)
    .filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = sortField === "name" ? a.name : a.createdAt;
      const bVal = sortField === "name" ? b.name : b.createdAt;
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const toggleSort = (field: "name" | "createdAt") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: "name" | "createdAt" }) =>
    sortField === field ? (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null;

  const pendingCount = users.filter(u => u.status === "PENDING").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and approvals.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Pending Banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Clock size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-amber-400">{pendingCount} user{pendingCount > 1 ? "s" : ""}</strong> waiting for approval
          </p>
          <button
            onClick={() => setFilter("PENDING")}
            className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            Show pending →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {f === "ALL" ? `All (${users.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${users.filter(u => u.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th
                    className="px-6 py-4 text-xs font-semibold text-muted-foreground text-left cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">User <SortIcon field="name" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-left">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-left">Status</th>
                  <th
                    className="px-6 py-4 text-xs font-semibold text-muted-foreground text-left cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">Joined <SortIcon field="createdAt" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const sc = statusConfig[user.status] ?? statusConfig.PENDING;
                  return (
                    <tr key={user.id} className="border-t border-border/20 hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium leading-tight">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground font-medium">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleAction(user.id, "approve-user")}
                                disabled={loadingId === user.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              >
                                {loadingId === user.id ? <span className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <UserCheck size={13} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(user.id, "reject-user")}
                                disabled={loadingId === user.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-all disabled:opacity-50"
                              >
                                <UserX size={13} /> Reject
                              </button>
                            </>
                          )}
                          {user.status === "REJECTED" && (
                            <button
                              onClick={() => handleAction(user.id, "approve-user")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                            >
                              <UserCheck size={13} /> Re-approve
                            </button>
                          )}
                          {user.status === "APPROVED" && (
                            <button
                              onClick={() => handleAction(user.id, "reject-user")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-all"
                            >
                              <UserX size={13} /> Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      {search ? "No users match your search" : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
