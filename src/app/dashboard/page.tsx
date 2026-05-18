import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FileSearch, Sparkles, Target, ArrowRight, TrendingUp } from "lucide-react";

const features = [
  {
    href: "/dashboard/check-score",
    icon: FileSearch,
    gradient: "from-violet-600/20 to-violet-800/10",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    title: "Check ATS Score",
    desc: "Upload your PDF and get an instant AI-powered ATS compatibility score with a full breakdown of issues and strengths.",
    tag: "Step 1",
    tagColor: "bg-violet-500/15 text-violet-400",
  },
  {
    href: "/dashboard/optimize",
    icon: Sparkles,
    gradient: "from-cyan-600/20 to-cyan-800/10",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
    title: "Optimize Resume",
    desc: "Our AI rewrites your resume to achieve a 9.5+ ATS score — improving keyword density, structure, and impact.",
    tag: "Step 2",
    tagColor: "bg-cyan-500/15 text-cyan-400",
  },
  {
    href: "/dashboard/tailor",
    icon: Target,
    gradient: "from-amber-600/20 to-amber-800/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    title: "Tailor for Job",
    desc: "Paste any job description and get a perfectly tailored resume with matched keywords, ATS score above 9.5, and a personalized cover letter.",
    tag: "Step 3",
    tagColor: "bg-amber-500/15 text-amber-400",
  },
  {
    href: "/dashboard/history",
    icon: Sparkles,
    gradient: "from-emerald-600/20 to-emerald-800/10",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    title: "Save as History",
    desc: "Keep track of all your optimized resumes safely stored in your history, so you can easily access or download them anytime.",
    tag: "Step 4",
    tagColor: "bg-emerald-500/15 text-emerald-400",
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 neon-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <TrendingUp size={13} />
            AI Resume Platform
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading tracking-tight mb-4">
            Hey {firstName},{" "}
            <span className="gradient-text">Let's create an ATS Friendly Job Resume in just a minute!</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Follow the 3-step flow to create a perfectly optimized, ATS-ready resume
            tailored to any job — all powered by advanced AI.
          </p>
          <Link
            href="/dashboard/check-score"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
          >
            Start with ATS Score Check <ArrowRight size={16} />
          </Link>
        </div>
        {/* Background decoration */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Sparkles size={200} className="text-primary" />
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-xl font-bold font-heading mb-5">Your Optimization Flow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {features.map(({ href, icon: Icon, gradient, border, iconColor, iconBg, title, desc, tag, tagColor }) => (
            <Link
              key={href}
              href={href}
              className={`group relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tagColor}`}>
                      {tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-heading mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Get started <ArrowRight size={13} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
