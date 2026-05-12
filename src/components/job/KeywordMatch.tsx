import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeywordMatchProps {
  matched: string[];
  missing: string[];
  suggestions: string;
}

export function KeywordMatch({ matched, missing, suggestions }: KeywordMatchProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Keyword Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium text-green-600 dark:text-green-400">Successfully Matched</h4>
          <div className="flex flex-wrap gap-2">
            {matched.length > 0 ? (
              matched.map((word, i) => (
                <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {word}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No matches found.</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-red-500">Missing Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {missing.length > 0 ? (
              missing.map((word, i) => (
                <Badge key={i} variant="outline" className="text-red-500 border-red-200 dark:border-red-900/50">
                  {word}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Excellent! No major keywords missing.</span>
            )}
          </div>
        </div>

        {suggestions && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">AI Suggestions</h4>
            <p className="text-sm text-muted-foreground">{suggestions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
