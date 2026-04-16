"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useSpellCheck } from "@/hooks/useSpellCheck";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ExportButton() {
  const { file, corrections } = useSpellCheck();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!file) {
      toast.error("No file loaded");
      return;
    }

    setIsExporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("corrections", JSON.stringify(corrections));

      const res = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Export failed");
      }

      const blob = await res.blob();

      if (blob.size === 0) {
        throw new Error("Failed to generate export file");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `corrected-${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Document exported successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Export error:", error);
      toast.error(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || !file}
      className="w-full sm:w-auto"
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? "Exporting..." : "Export Corrected DOCX"}
    </Button>
  );
}
