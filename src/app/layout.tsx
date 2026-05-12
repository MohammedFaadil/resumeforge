import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResumeForge — Beat the ATS, Land the Job",
  description:
    "AI-powered ATS optimization platform. Check your ATS score, optimize your resume for 9.5+, edit online, and tailor for any job description.",
  keywords: ["ATS", "resume", "optimization", "AI", "job application"],
  openGraph: {
    title: "ResumeForge — Beat the ATS, Land the Job",
    description: "AI-powered resume optimization with ATS scoring, tailoring, and online editing.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
        {/* Ambient background glow */}
        <div className="fixed inset-0 z-[-2] pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[120px] animate-glow-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan/5 blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
        {/* Dot grid */}
        <div className="fixed inset-0 z-[-1] h-full w-full bg-[radial-gradient(oklch(0.30_0.03_255)_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
