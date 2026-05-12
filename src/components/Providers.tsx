"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: "oklch(0.13 0.025 255)",
            border: "1px solid oklch(0.22 0.03 255)",
            color: "oklch(0.96 0.01 250)",
          },
        }}
      />
    </SessionProvider>
  );
}
