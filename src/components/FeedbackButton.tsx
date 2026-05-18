"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, X, Loader2 } from "lucide-react";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Failed to send feedback");

      toast.success("Thank you for your feedback!");
      setIsOpen(false);
      setMessage("");
    } catch (error) {
      toast.error("Failed to send feedback");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/20 hover:scale-110 hover:shadow-primary/40 transition-all z-50 flex items-center justify-center group"
      >
        <MessageSquare size={24} />
        <span className="absolute right-full mr-4 bg-background border border-border text-foreground px-3 py-1.5 rounded-xl text-sm font-medium opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap shadow-lg">
          Share Feedback
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden relative flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
              <h3 className="font-bold font-heading text-lg flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" /> Share Feedback
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">What's on your mind?</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Suggestions, bugs, or feature requests..."
                  className="w-full min-h-[120px] p-4 rounded-xl bg-input border border-border/50 focus:outline-none focus:border-primary/50 text-sm placeholder:text-muted-foreground resize-none transition-all"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
