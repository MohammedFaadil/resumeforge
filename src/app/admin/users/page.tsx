"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, Trash2, RefreshCw,
  ChevronUp, ChevronDown, Loader2
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
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

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to completely delete this user and all their data?")) return;
    
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast.success(`User deleted successfully`);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete user");
      }
    } catch { toast.error("An error occurred"); }
    finally { setLoadingId(null); }
  };

  const filtered = users
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts in your platform.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
          />
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
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={loadingId === user.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-all disabled:opacity-50"
                            >
                              {loadingId === user.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                            </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
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
