"use client";

import React, { useMemo } from "react";
import { useSpellCheck } from "@/hooks/useSpellCheck";
import { WordSuggestionCard } from "./WordSuggestionCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CheckCheck, XCircle } from "lucide-react";
import { SpellError } from "@/types";

const ErrorList = React.memo(({ errors, title }: { errors: SpellError[]; title?: string }) => {
  if (errors.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">
        <p>No issues found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {title && <h3 className="font-semibold text-lg mb-4">{title}</h3>}
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {errors.map((error) => (
            <WordSuggestionCard
              key={`${error.paragraph}-${error.index}-${error.word}-${error.dialect}`}
              error={error}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

ErrorList.displayName = "ErrorList";

export function SpellCheckPanel() {
  const { errors, dialect, acceptAll, ignoreAll } = useSpellCheck();

  const usErrors = useMemo(() => errors.filter((e) => e.dialect === "us"), [errors]);
  const ukErrors = useMemo(() => errors.filter((e) => e.dialect === "uk"), [errors]);

  const visibleErrorsCount = useMemo(() => {
    if (dialect === "us") return usErrors.length;
    if (dialect === "uk") return ukErrors.length;
    return errors.length;
  }, [dialect, usErrors.length, ukErrors.length, errors.length]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          3. Review Corrections ({visibleErrorsCount})
        </h2>
        {visibleErrorsCount > 0 && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={ignoreAll}>
              <XCircle className="w-4 h-4 mr-2" />
              Ignore All
            </Button>
            <Button size="sm" onClick={acceptAll}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Accept All
            </Button>
          </div>
        )}
      </div>

      {dialect === "both" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          <ErrorList errors={usErrors} title={`US English (${usErrors.length})`} />
          <ErrorList errors={ukErrors} title={`UK English (${ukErrors.length})`} />
        </div>
      ) : (
        <ErrorList errors={dialect === "us" ? usErrors : ukErrors} />
      )}
    </div>
  );
}
