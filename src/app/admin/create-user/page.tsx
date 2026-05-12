"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateUserPage() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "USER", status: "APPROVED"
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create user");
      setCreated(true);
      toast.success("User created successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl bg-input border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all";
  const selectCls = `${inputCls} cursor-pointer`;

  if (created) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold font-heading">User Created!</h2>
        <p className="text-muted-foreground">
          The account for <strong className="text-foreground">{form.email}</strong> has been created
          {form.status === "APPROVED" ? " and is immediately active." : " and is pending approval."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setCreated(false); setForm({ name: "", email: "", password: "", role: "USER", status: "APPROVED" }); }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            Create Another
          </button>
          <Link
            href="/admin/users"
            className="px-5 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted/20 transition-all"
          >
            View All Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/20">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold font-heading tracking-tight">Create User</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manually create accounts and set their role and status.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-border/30 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="cu-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</label>
          <input id="cu-name" type="text" required placeholder="John Doe" value={form.name}
            onChange={e => set("name", e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cu-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Address</label>
          <input id="cu-email" type="email" required placeholder="john@example.com" value={form.email}
            onChange={e => set("email", e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cu-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
          <div className="relative">
            <input id="cu-password" type={showPw ? "text" : "password"} required minLength={6}
              placeholder="Min. 6 characters" value={form.password}
              onChange={e => set("password", e.target.value)} className={`${inputCls} pr-12`} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="cu-role" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</label>
            <select id="cu-role" value={form.role} onChange={e => set("role", e.target.value)} className={selectCls}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cu-status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
            <select id="cu-status" value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
              <option value="APPROVED">Approved (Active)</option>
              <option value="PENDING">Pending Approval</option>
            </select>
          </div>
        </div>

        {/* Role info */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">User:</strong> Can use all resume features. Requires admin approval (unless set to Approved).</p>
          <p><strong className="text-foreground">Admin:</strong> Can access admin panel, manage users, and view analytics.</p>
          <p><strong className="text-foreground">Super Admin:</strong> Full access including managing other admins.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          id="create-user-submit"
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><UserPlus size={16} /> Create User</>}
        </button>
      </form>
    </div>
  );
}
