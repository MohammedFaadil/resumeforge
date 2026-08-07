"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, FileSearch, Sparkles, Target,
  History, ShieldCheck, LogOut, ChevronRight, Menu, X, User
} from "lucide-react";

type Props = {
  user: { name: string; email: string; role: string; image?: string };
};

const navItems = [
  { href: "/dashboard",            label: "Overview",       icon: LayoutDashboard, exact: true },
  { href: "/dashboard/check-score",label: "Check ATS Score",icon: FileSearch },
  { href: "/dashboard/optimize",   label: "Optimize Resume",icon: Sparkles },
  { href: "/dashboard/tailor",     label: "Tailor for Job", icon: Target },
  { href: "/dashboard/history",    label: "History",        icon: History },
  { href: "/dashboard/profile",    label: "Profile",        icon: User },
];

export function DashboardSidebar({ user }: Props) {
  const pathname  = usePathname();
  const isAdmin   = user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.email === "resumeforgeweb@gmail.com" || user.email === "admin@gmail.com";
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = user.name
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const NavLinks = () => (
    <>
      <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-2 pb-2">
        Workspace
      </p>
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-primary/12 text-primary border-l-2 border-primary pl-[calc(0.75rem-2px)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Icon size={17} className={`shrink-0 transition-transform ${active ? "text-primary" : "group-hover:scale-110"}`} />
            <span className="flex-1">{label}</span>
            {active && <ChevronRight size={14} className="text-primary/60" />}
          </Link>
        );
      })}

      {isAdmin && (
        <>
          <div className="h-px bg-border/40 my-3" />
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-2">
            Administration
          </p>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith("/admin")
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <ShieldCheck size={17} className="shrink-0" />
            Admin Panel
          </Link>
        </>
      )}
    </>
  );

  const UserFooter = () => (
    <div className="p-3 border-t border-border/30">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
        {user.image ? (
          <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/30"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-sidebar/95 backdrop-blur-xl border-b border-border/30">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow shadow-primary/30 group-hover:shadow-primary/50 transition-all">
            <span className="text-primary-foreground font-bold text-xs font-heading">RF</span>
          </div>
          <span className="font-bold font-heading text-base tracking-tight group-hover:text-primary transition-colors">ResumeForge</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-xl hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ───────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-[100dvh] w-72 flex flex-col bg-sidebar/95 backdrop-blur-xl border-r border-border/30 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border/30 flex items-center justify-between">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
              <span className="text-primary-foreground font-bold text-xs font-heading">RF</span>
            </div>
            <span className="font-bold font-heading text-lg tracking-tight group-hover:text-primary transition-colors">ResumeForge</span>
          </Link>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 h-screen flex-col border-r border-border/50 bg-sidebar/80 backdrop-blur-xl shrink-0">
        <div className="p-5 border-b border-border/30">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
              <span className="text-primary-foreground font-bold text-xs font-heading">RF</span>
            </div>
            <span className="font-bold font-heading text-lg tracking-tight group-hover:text-primary transition-colors">ResumeForge</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>
    </>
  );
}
