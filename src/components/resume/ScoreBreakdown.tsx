import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScoreBreakdownProps {
  breakdown: Record<string, number>;
  issues: string[];
  strengths: string[];
}

export function ScoreBreakdown({ breakdown, issues, strengths }: ScoreBreakdownProps) {
  const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">Detailed Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Metrics</h4>
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{formatKey(key)}</span>
                <span className="font-medium">{value}/10</span>
              </div>
              <Progress value={value * 10} className="h-2" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Strengths</h4>
              <ul className="list-disc pl-4 text-sm space-y-1 text-muted-foreground">
                {strengths.map((str, i) => <li key={i}>{str}</li>)}
              </ul>
            </div>
          )}
          
          {issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-500">Areas to Improve</h4>
              <ul className="list-disc pl-4 text-sm space-y-1 text-muted-foreground">
                {issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
