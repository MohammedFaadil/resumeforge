"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, disabled }: DropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled,
  });

  return (
    <Card 
      className={`border-2 border-dashed ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"} 
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"} transition-colors`}
      {...getRootProps()}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <input {...getInputProps()} />
        {acceptedFiles.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <FileIcon className="h-10 w-10 text-primary" />
            <p className="font-medium text-sm">{acceptedFiles[0].name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {isDragActive ? "Drop the PDF here" : "Drag & drop your resume PDF here"}
            </p>
            <p className="text-sm text-muted-foreground">or click to select file</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
