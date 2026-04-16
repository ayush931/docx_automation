"use client";

import React, { useMemo, useState } from "react";
import { useSpellCheck } from "@/hooks/useSpellCheck";
import { SpellError } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const ErrorHighlight = ({ error, text, onCorrect }: { error: SpellError; text: string; onCorrect: (replacement: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getHighlightColor = () => {
    switch (error.type) {
      case 'spelling':
        return 'bg-red-200 dark:bg-red-900/40 border-b-2 border-red-500';
      case 'punctuation':
        return 'bg-orange-200 dark:bg-orange-900/40 border-b-2 border-orange-500';
      case 'consistency':
        return 'bg-blue-200 dark:bg-blue-900/40 border-b-2 border-blue-500';
      case 'style':
        return 'bg-purple-200 dark:bg-purple-900/40 border-b-2 border-purple-500';
      default:
        return 'bg-yellow-200 dark:bg-yellow-900/40 border-b-2 border-yellow-500';
    }
  };

  const getTypeLabel = () => {
    switch (error.type) {
      case 'spelling':
        return 'Spelling';
      case 'punctuation':
        return 'Punctuation';
      case 'consistency':
        return 'Consistency';
      case 'style':
        return 'Style';
      default:
        return 'Error';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className={`cursor-pointer relative inline-block px-1 rounded transition-all hover:opacity-80 ${getHighlightColor()}`} title={error.message || `${getTypeLabel()} error`}>
        {text}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-3">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{text}</p>
              <Badge variant="secondary" className="text-xs">{getTypeLabel()}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>

          {error.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {error.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      onCorrect(suggestion);
                      setIsOpen(false);
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                // Ignore the error
                setIsOpen(false);
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Ignore
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function DocumentContentViewer() {
  const { parsedDoc, errors, addCorrection, dialect } = useSpellCheck();
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);

  const filteredErrors = useMemo(() => {
    if (!parsedDoc) return [];
    if (dialect === "both") {
      return errors;
    }
    return errors.filter(e => e.dialect === dialect);
  }, [errors, dialect, parsedDoc]);

  const errorsByParagraph = useMemo(() => {
    const map = new Map<number, SpellError[]>();
    filteredErrors.forEach((error) => {
      if (!map.has(error.paragraph)) {
        map.set(error.paragraph, []);
      }
      map.get(error.paragraph)!.push(error);
    });
    return map;
  }, [filteredErrors]);

  if (!parsedDoc) {
    return null;
  }

  const renderParagraphWithHighlights = (paragraphIndex: number, text: string) => {
    const paragraphErrors = errorsByParagraph.get(paragraphIndex) || [];

    if (paragraphErrors.length === 0) {
      return <span>{text}</span>;
    }

    // Sort errors by index (descending) to maintain correct positions
    const sortedErrors = [...paragraphErrors].sort((a, b) => b.index - a.index);

    const elements: React.ReactNode[] = [];
    let lastIndex = text.length;

    sortedErrors.forEach((error, idx) => {
      const endIndex = error.index + error.word.length;

      // Add text after this error
      if (endIndex < lastIndex) {
        elements.unshift(<span key={`text-${idx}`}>{text.substring(endIndex, lastIndex)}</span>);
      }

      // Add the error highlight
      elements.unshift(
        <ErrorHighlight
          key={`error-${idx}`}
          error={error}
          text={text.substring(error.index, endIndex)}
          onCorrect={(replacement) => {
            addCorrection({
              original: error.word,
              replacement,
              paragraph: error.paragraph,
              index: error.index,
              dialect: error.dialect,
            });
          }}
        />
      );

      lastIndex = error.index;
    });

    // Add remaining text at the beginning
    if (lastIndex > 0) {
      elements.unshift(<span key="text-start">{text.substring(0, lastIndex)}</span>);
    }

    return <span>{elements}</span>;
  };

  const totalErrors = filteredErrors.length;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Document Preview</h3>
        <span className="text-sm text-muted-foreground">
          {totalErrors} issue{totalErrors !== 1 ? 's' : ''} found
        </span>
      </div>

      <Card className="border">
        <CardContent className="p-6">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4 text-sm leading-relaxed">
              {parsedDoc.paragraphs.map((paragraph, index) => {
                const paragraphErrorCount = errorsByParagraph.get(index)?.length || 0;
                const isSelected = selectedParagraph === index;

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedParagraph(isSelected ? null : index)}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : paragraphErrorCount > 0
                        ? 'border-orange-200 dark:border-orange-900/50 hover:border-orange-300'
                        : 'border-muted hover:border-muted-foreground/50'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Paragraph {index + 1}
                      </span>
                      {paragraphErrorCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {paragraphErrorCount} error{paragraphErrorCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="text-foreground">
                      {renderParagraphWithHighlights(index, paragraph)}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Click on highlighted words to view suggestions and corrections
      </p>
    </div>
  );
}
