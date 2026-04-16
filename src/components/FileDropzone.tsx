"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import type { FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

export function FileDropzone() {
  const { handleUpload, isUploading, error } = useFileUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    [handleUpload]
  );

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) {
      return;
    }

    const firstErrorCode = fileRejections[0].errors[0]?.code;
    if (firstErrorCode === "file-invalid-type") {
      alert("Unsupported file type. Please upload a .docx or .pdf file.");
      return;
    }

    alert("Unable to upload this file. Please try another .docx or .pdf file.");
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: isUploading,
    noClick: true,
  });

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div
        {...getRootProps()}
        onClick={() => {
          if (!isUploading) {
            open();
          }
        }}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/25 hover:border-primary/50"
          } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          {...getInputProps({
            onClick: (event) => {
              (event.target as HTMLInputElement).value = "";
            },
          })}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading
                ? "Processing document..."
                : isDragActive
                  ? "Drop the DOCX or PDF file here"
                  : "Drag & drop a DOCX or PDF file here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .docx and .pdf files
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isUploading) {
                  open();
                }
              }}
              className="mt-3 text-xs underline underline-offset-2 text-primary hover:opacity-80"
            >
              Browse files
            </button>
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
