"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, UserPlus, BarChart3, FileText,
  ArrowLeft, LogOut, ShieldCheck, ChevronRight
} from "lucide-react";

type Props = { user: { name: string; email: string; role: string }, onClose?: () => void };

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/create-user", label: "Create User", icon: UserPlus },
  { href: "/admin/resumes", label: "Resumes", icon: FileText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar({ user, onClose }: Props) {
  const pathname = usePathname();
  const initials = user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-64 h-[100dvh] flex flex-col border-r border-border/50 bg-sidebar/80 backdrop-blur-xl shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold font-heading text-sm leading-tight">Admin Panel</p>
            <p className="text-xs text-muted-foreground">ResumeForge</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-2 pb-2">
          Admin Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-violet-600/12 text-violet-400 border-l-2 border-violet-600 pl-[calc(0.75rem-2px)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Icon size={17} className={`shrink-0 ${active ? "text-violet-400" : ""}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-violet-400/60" />}
            </Link>
          );
        })}

        <div className="h-px bg-border/40 my-3" />
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
        >
          <ArrowLeft size={17} className="shrink-0" /> Back to App
        </Link>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
          <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-violet-400">{user.role}</p>
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
    </aside>
  );
}
