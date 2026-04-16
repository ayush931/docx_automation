"use client";

import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { SpellError } from "@/types";
import { useSpellCheck } from "@/hooks/useSpellCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function WordSuggestionCard({ error }: { error: SpellError }) {
  const { addCorrection, ignoreError } = useSpellCheck();
  const [customReplacement, setCustomReplacement] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleAccept = (replacement: string) => {
    addCorrection({
      original: error.word,
      replacement,
      paragraph: error.paragraph,
      index: error.index,
      dialect: error.dialect,
    });
  };

  const handleIgnore = () => {
    ignoreError(error.paragraph, error.index, error.word);
  };

  const getBadgeColor = () => {
    switch (error.type) {
      case 'spelling': return 'text-destructive';
      case 'punctuation': return 'text-orange-500';
      case 'consistency': return 'text-blue-500';
      case 'style': return 'text-purple-500';
      default: return 'text-destructive';
    }
  };

  return (
    <Card className="mb-4 overflow-hidden border-destructive/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${getBadgeColor()} ${error.type === 'spelling' ? 'line-through decoration-destructive/50' : ''} decoration-2`}>
              {error.word}
            </h3>
            <p className="text-sm font-medium mt-1">
              {error.message || `${error.type.charAt(0).toUpperCase() + error.type.slice(1)} error`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.dialect === "us" ? "US English" : "UK English"}
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={handleIgnore} title="Ignore">
              <X className="w-4 h-4" />
              <span className="sr-only">Ignore</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {error.suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {error.suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAccept(suggestion)}
                  className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No suggestions found.</p>
          )}

          {isEditing ? (
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="text"
                value={customReplacement}
                onChange={(e) => setCustomReplacement(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Type custom correction..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customReplacement) {
                    handleAccept(customReplacement);
                    setIsEditing(false);
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  handleAccept(customReplacement);
                  setIsEditing(false);
                }}
                disabled={!customReplacement}
              >
                Apply
              </Button>
            </div>
          ) : (
            <Button
              variant="link"
              size="sm"
              className="text-xs px-0 h-auto text-muted-foreground"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Custom replacement
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
