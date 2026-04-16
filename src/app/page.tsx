"use client";

import { FileDropzone } from "@/components/FileDropzone";
import { SpellCheckPanel } from "@/components/SpellCheckPanel";
import { DocumentContentViewer } from "@/components/DocumentContentViewer";
import { DialectToggle } from "@/components/DialectToggle";
import { ExportButton } from "@/components/ExportButton";
import { useSpellCheck } from "@/hooks/useSpellCheck";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function Home() {
  const { file, isProcessing, reset } = useSpellCheck();

  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            DOCX Spell Checker
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground">
            Upload your document, review US vs UK English spelling errors, and
            export the corrected file.
          </p>
        </header>

        {!file && !isProcessing && (
          <section
            aria-label="Upload Document"
            className="border rounded-lg bg-card text-card-foreground shadow-sm p-6 space-y-4"
          >
            <h2 className="text-2xl font-bold tracking-tight">1. Upload Document</h2>
            <FileDropzone />
          </section>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg text-muted-foreground">Processing document...</p>
          </div>
        )}

        {file && !isProcessing && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Section 2: Document Details & Settings */}
            <section
              aria-label="Document Settings"
              className="border rounded-lg bg-card text-card-foreground shadow-sm p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    2. Document Details & Settings
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Review your document and choose the dialect for spell checking.
                  </p>
                </div>
                <Button variant="outline" onClick={reset}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-muted/30 mt-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Document</p>
                  <p className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">
                    {file.name}
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <DialectToggle />
                </div>
              </div>
            </section>

            {/* Section 3: Document Content & Preview */}
            <section
              aria-label="Document Content Preview"
              className="border rounded-lg bg-card text-card-foreground shadow-sm p-6"
            >
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                3. Document Content & Preview
              </h2>
              <p className="text-muted-foreground mb-4">
                View your document content with spelling errors highlighted. Click on highlighted words to see suggestions.
              </p>
              <DocumentContentViewer />
            </section>

            {/* Section 4: Review Corrections */}
            <section
              aria-label="Review Corrections"
              className="border rounded-lg bg-card text-card-foreground shadow-sm p-6"
            >
              <SpellCheckPanel />
            </section>

            {/* Section 5: Export Document */}
            <section
              aria-label="Export Document"
              className="border rounded-lg bg-card text-card-foreground shadow-sm p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    5. Export Document
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Export your document with all the applied corrections.
                  </p>
                </div>
                <ExportButton />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
