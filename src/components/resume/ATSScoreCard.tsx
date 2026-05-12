import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ATSScoreCardProps {
  score: number;
}

export function ATSScoreCard({ score }: ATSScoreCardProps) {
  // Determine color based on score
  let colorClass = "text-red-500";
  let bgGradient = "from-red-500/20 to-red-600/5";
  if (score >= 9.0) {
    colorClass = "text-emerald-500";
    bgGradient = "from-emerald-500/20 to-emerald-600/5";
  } else if (score >= 7.0) {
    colorClass = "text-amber-500";
    bgGradient = "from-amber-500/20 to-amber-600/5";
  }

  return (
    <Card className={`flex flex-col items-center justify-center text-center p-6 border-none shadow-xl bg-gradient-to-b ${bgGradient} relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]" />
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-xl font-bold tracking-tight">ATS Score Match</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="relative flex items-center justify-center w-48 h-48 drop-shadow-xl">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-muted/30"
            />
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={528}
              strokeDashoffset={528 - (528 * score) / 10}
              className={`transition-all duration-1500 ease-out ${colorClass} drop-shadow-md`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center animate-in zoom-in-75 duration-700 delay-300">
            <span className={`text-6xl font-extrabold ${colorClass} drop-shadow-sm tracking-tighter`}>{score.toFixed(1)}</span>
            <span className="text-sm font-medium text-muted-foreground mt-1">out of 10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
