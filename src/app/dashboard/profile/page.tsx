"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, User, Phone, Mail, Lock } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setFormData({ name: data.name || "", phone: data.phone || "" });
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setIsFetching(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      toast.success("Profile updated successfully");
      update({ name: formData.name }); // Update session
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    setIsPasswordLoading(true);

    try {
      const res = await fetch("/api/user/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword: passwordData.currentPassword, 
          newPassword: passwordData.newPassword 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password");

      toast.success("Password updated successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (isFetching) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-fade-scale">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading">Your Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your personal information.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 neon-border">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30 text-xl font-bold">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{session?.user?.name}</h2>
            <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User size={16} /> Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:border-primary/50 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Phone size={16} /> Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:border-primary/50 transition-all"
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail size={16} /> Email Address (Read-only)
            </label>
            <input
              type="email"
              value={session?.user?.email || ""}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 border border-border/30 mt-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <p className="text-muted-foreground text-sm mt-1">Update your password to keep your account secure.</p>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock size={16} /> Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:border-primary/50 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock size={16} /> New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:border-primary/50 transition-all"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock size={16} /> Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:border-primary/50 transition-all"
              required
              minLength={6}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPasswordLoading}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isPasswordLoading && <Loader2 size={16} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
