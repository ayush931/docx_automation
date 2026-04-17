import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText, WandSparkles } from "lucide-react";
import { GuidelineDropzone } from "@/components/GuidelineDropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Guideline Implementation | DOCX Spell Checker",
  description: "A dedicated page for applying editorial guidelines directly to DOCX files.",
};

const guidelineHighlights = [
  "Collapse repeated spaces.",
  "Normalize number spans and straight quotation marks.",
  "Apply auto proofreading suggestions (spelling, punctuation, style) by selected dialect.",
  "Skip table-of-contents style sections to avoid accidental edits.",
  "Return a downloadable DOCX with the applied changes.",
];

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.18))] px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/5 backdrop-blur sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to spell checker
            </Link>
            <div className="hidden items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              <WandSparkles className="h-3.5 w-3.5" />
              Editorial workflow
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <BookOpenText className="h-3.5 w-3.5" />
                Special guideline page
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Apply copyediting guidelines directly to the same DOCX.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Use this dedicated page when you want the document adjusted only to the automated rules explicitly described in the guideline DOCX files.
                It keeps the main spell checker untouched and avoids adding unrelated services or editorial changes that were not requested.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {guidelineHighlights.map((item) => (
                <Card key={item} size="sm" className="border-border/60 bg-background/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Guideline focus</CardTitle>
                    <CardDescription>{item}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <GuidelineDropzone />

        <Card className="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>
              This page handles a direct DOCX transformation flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-sm font-semibold">1. Upload</p>
              <p className="mt-1 text-sm text-muted-foreground">Drop a DOCX file into the guideline page.</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-sm font-semibold">2. Apply</p>
              <p className="mt-1 text-sm text-muted-foreground">The server rewrites supported guideline patterns in the document XML.</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-sm font-semibold">3. Download</p>
              <p className="mt-1 text-sm text-muted-foreground">The corrected DOCX downloads automatically with the applied changes.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
