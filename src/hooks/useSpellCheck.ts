import { create } from "zustand";
import { ParsedDocument, SpellError, Dialect, Correction } from "@/types";

interface SpellCheckState {
  file: File | null;
  parsedDoc: ParsedDocument | null;
  errors: SpellError[];
  corrections: Correction[];
  dialect: Dialect;
  isProcessing: boolean;
  setFile: (file: File | null) => void;
  setParsedDoc: (doc: ParsedDocument | null) => void;
  setErrors: (errors: SpellError[]) => void;
  clearCorrections: () => void;
  addCorrection: (correction: Correction) => void;
  ignoreError: (paragraph: number, index: number, word: string) => void;
  setDialect: (dialect: Dialect) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  reset: () => void;
  acceptAll: () => void;
  ignoreAll: () => void;
}

export const useSpellCheck = create<SpellCheckState>((set, get) => ({
  file: null,
  parsedDoc: null,
  errors: [],
  corrections: [],
  dialect: "both",
  isProcessing: false,

  setFile: (file) => set({ file }),
  setParsedDoc: (doc) => set({ parsedDoc: doc }),
  setErrors: (errors) => set({ errors }),
  clearCorrections: () => set({ corrections: [] }),

  addCorrection: (correction) => set((state) => ({
    corrections: [...state.corrections, correction],
    errors: state.errors.filter(
      (err) => !(err.paragraph === correction.paragraph && err.index === correction.index && err.word === correction.original)
    )
  })),

  ignoreError: (paragraph, index, word) => set((state) => ({
    errors: state.errors.filter(
      (err) => !(err.paragraph === paragraph && err.index === index && err.word === word)
    )
  })),

  setDialect: (dialect) => set({ dialect }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  reset: () => set({
    file: null,
    parsedDoc: null,
    errors: [],
    corrections: [],
    dialect: "both",
    isProcessing: false,
  }),

  acceptAll: () => {
    const { errors, dialect } = get();
    // Accept top suggestion for all errors in the active dialect view
    const toAccept = dialect === "both" ? errors : errors.filter(e => e.dialect === dialect);
    const newCorrections = toAccept.map(err => ({
      original: err.word,
      replacement: err.suggestions[0] || err.word,
      paragraph: err.paragraph,
      index: err.index,
      dialect: err.dialect,
    }));

    set((state) => ({
      corrections: [...state.corrections, ...newCorrections],
      errors: state.errors.filter(e =>
        (dialect !== "both" && e.dialect !== dialect)
      )
    }));
  },

  ignoreAll: () => {
    const { dialect } = get();
    set((state) => ({
      errors: state.errors.filter(e =>
        (dialect !== "both" && e.dialect !== dialect)
      )
    }));
  }
}));
