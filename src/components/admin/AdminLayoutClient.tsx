"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Menu, X } from "lucide-react";

export function AdminLayoutClient({ children, user }: { children: React.ReactNode, user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background relative w-full">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden absolute top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-sm text-foreground"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - fixed on mobile, static on desktop */}
      <div className={`fixed md:static inset-y-0 left-0 z-40 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <AdminSidebar user={user} onClose={() => setIsOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto w-full md:w-auto h-[100dvh] relative">
        <div className="md:hidden h-16 w-full flex items-center justify-center border-b border-border bg-card/50 backdrop-blur-sm">
          <span className="font-bold font-heading">Admin Panel</span>
        </div>
        {children}
      </main>
    </div>
  );
}
