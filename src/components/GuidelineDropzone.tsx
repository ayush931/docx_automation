"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Download, FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getErrorMessage(res: Response, fallback: string): Promise<string> {
  return res
    .json()
    .then((json: unknown) => {
      if (json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string") {
        return (json as { error: string }).error;
      }

      return fallback;
    })
    .catch(() => fallback);
}

async function downloadBlobFromResponse(response: Response, filename: string): Promise<void> {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GuidelineDropzone() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState<string | null>(null);
  const [dialect, setDialect] = useState<"us" | "uk" | "both">("uk");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0] || null;
    setSelectedFile(file);
    setMessage(file ? `Ready to apply guidelines to ${file.name}.` : null);
    setOutputName(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: false,
    disabled: isApplying,
    noClick: true,
  });

  const helperText = useMemo(() => {
    if (isApplying) {
      return "Applying document guidelines...";
    }

    if (selectedFile) {
      return `Selected file: ${selectedFile.name}`;
    }

    return "Drop a DOCX file here to apply the copyediting guidelines.";
  }, [isApplying, selectedFile]);

  const applyGuidelines = async () => {
    if (!selectedFile || isApplying) {
      return;
    }

    setIsApplying(true);
    setMessage(null);
    setOutputName(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("dialect", dialect);

      const response = await fetch("/api/guidelines", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(response, "Failed to apply guidelines.");
        throw new Error(errorMessage);
      }

      const downloadedName = `guideline-applied-${selectedFile.name}`;
      await downloadBlobFromResponse(response, downloadedName);
      setOutputName(downloadedName);
      setMessage("Guidelines applied successfully. The corrected DOCX has been downloaded.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to apply guidelines.";
      setMessage(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-xl shadow-black/5">
      <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 pb-5">
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5" />
          Guideline Implementation
        </CardTitle>
        <CardDescription>
          Upload a DOCX, apply the editorial guidelines, and download the updated file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div
          {...getRootProps()}
          onClick={() => {
            if (!isApplying) {
              open();
            }
          }}
          className={`rounded-2xl border border-dashed p-8 text-center transition-all ${isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-background/70 hover:border-primary/50 hover:bg-muted/30"
            } ${isApplying ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <input
            {...getInputProps({
              onClick: (event) => {
                (event.target as HTMLInputElement).value = "";
              },
            })}
          />
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium">
                {isDragActive ? "Drop the DOCX here" : "Drag and drop a DOCX file"}
              </p>
              <p className="text-sm text-muted-foreground">
                {helperText}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={(event) => {
              event.stopPropagation();
              if (!isApplying) {
                open();
              }
            }}>
              Browse files
            </Button>
          </div>
        </div>

        {selectedFile && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready file</p>
              <p className="font-semibold">{selectedFile.name}</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <label className="text-xs text-muted-foreground" htmlFor="guideline-dialect">
                Dialect
              </label>
              <select
                id="guideline-dialect"
                value={dialect}
                onChange={(event) => setDialect(event.target.value as "us" | "uk" | "both")}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                disabled={isApplying}
              >
                <option value="uk">UK English</option>
                <option value="us">US English</option>
                <option value="both">Both</option>
              </select>
              <Button onClick={applyGuidelines} disabled={isApplying}>
                <Download className="mr-2 h-4 w-4" />
                {isApplying ? "Applying..." : "Apply Guidelines"}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-background/70 p-4 text-sm text-muted-foreground">
          {message || "This page focuses on direct guideline application instead of spell review."}
          {outputName && (
            <div className="mt-2 font-medium text-foreground">Downloaded: {outputName}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
