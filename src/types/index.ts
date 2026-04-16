export type Dialect = "us" | "uk" | "both";

export type ErrorType = "spelling" | "punctuation" | "consistency" | "style";

export type SpellError = {
  word: string;
  type: ErrorType;
  index: number; // Index in the specific paragraph
  paragraph: number; // Paragraph index
  offset: number; // Global offset if needed
  suggestions: string[];
  dialect: "us" | "uk";
  message?: string; // Optional descriptive message
};

export type SpellCheckResult = {
  errors: SpellError[];
  dialect: Dialect;
};

export type Correction = {
  original: string;
  replacement: string;
  paragraph: number;
  index: number;
  dialect: "us" | "uk";
};

export type ParsedDocument = {
  paragraphs: string[];
  rawText: string;
  wordCount: number;
};
