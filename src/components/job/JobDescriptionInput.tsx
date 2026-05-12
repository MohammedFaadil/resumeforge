"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JobDescriptionInputProps {
  onSubmit: (data: { jobDescription: string; companyName: string; jobTitle: string }) => void;
  isLoading: boolean;
}

export function JobDescriptionInput({ onSubmit, isLoading }: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim().length > 50) {
      onSubmit({ jobDescription, companyName, jobTitle });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
        <CardDescription>Paste the job description you want to tailor your resume for.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title (Optional)</Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="jobDescription">Job Description *</Label>
              <span className="text-xs text-muted-foreground">{jobDescription.length} chars</span>
            </div>
            <Textarea
              id="jobDescription"
              placeholder="Paste the full job description here..."
              className="min-h-[250px]"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || jobDescription.trim().length < 50}
          >
            {isLoading ? "Tailoring Resume..." : "Tailor My Resume"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
