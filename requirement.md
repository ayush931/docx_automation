# DOCX Spell Checker Web Tool — Engineering Prompt

> **Role:** You are a senior full-stack engineer with deep expertise in Next.js App Router, TypeScript, and document processing pipelines.

---

## Objective

Build a **production-ready, web-based DOCX spell checker** using **Next.js 14+ (App Router)**. The tool must:

- Accept `.docx` file uploads via drag-and-drop or file picker
- Extract raw text from the DOCX (preserving paragraph structure)
- Perform spell checking against **US English** and **UK English** dictionaries independently
- Display a diff-style UI showing misspelled words, their positions, and suggested corrections per dialect
- Allow the user to **accept**, **ignore**, or **replace** suggestions inline
- Export the **corrected DOCX** with all changes applied

---

## Tech Stack

| Layer              | Choice                                                          |
| ------------------ | --------------------------------------------------------------- |
| Framework          | Next.js 14+ App Router, TypeScript strict mode                  |
| Styling            | Tailwind CSS + shadcn/ui                                        |
| DOCX parsing       | `mammoth` (extract text + HTML)                                 |
| DOCX writing       | `pizzip` + `docxtemplater`                                      |
| Spell check engine | `nspell` with `dictionary-en-us` and `dictionary-en-gb`         |
| File upload        | Native `FormData` via Route Handler (no third-party upload lib) |
| State management   | Zustand (minimal, scoped to spell check session)                |
| Testing            | Vitest + React Testing Library                                  |

---

## Project Structure

```
/app
  /api
    /upload/route.ts           → Handles DOCX upload, returns extracted text
    /spellcheck/route.ts       → Accepts text, returns spell errors per dialect
    /export/route.ts           → Accepts corrected content, returns fixed DOCX
  /page.tsx                    → Main UI entry point
  /components
    FileDropzone.tsx
    SpellCheckPanel.tsx
    WordSuggestionCard.tsx
    DialectToggle.tsx
    ExportButton.tsx
  /lib
    docxParser.ts              → mammoth extraction logic
    spellChecker.ts            → nspell engine abstraction (singleton)
    docxWriter.ts              → Apply corrections and rebuild DOCX
  /hooks
    useSpellCheck.ts
    useFileUpload.ts
  /types
    index.ts
  /middleware.ts               → Rate limiting
```

---

## Core Requirements

### 1. File Upload API — `/api/upload`

- Accept `multipart/form-data`, validate MIME type:
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Enforce max file size of **10MB** server-side
- Use `mammoth.extractRawText()` for plain text and `mammoth.convertToHtml()` for structure
- Return shape:

```ts
{
  paragraphs: string[]
  rawText: string
  wordCount: number
}
```

---

### 2. Spell Check API — `/api/spellcheck`

- Load both `nspell` dictionaries at **module level as a singleton** — never per request
- Accept:

```ts
{
  text: string;
  dialect: "us" | "uk" | "both";
}
```

- Return structured errors:

```ts
type SpellError = {
  word: string;
  index: number;
  paragraph: number;
  offset: number;
  suggestions: string[];
  dialect: "us" | "uk";
};
```

- For `'both'`, run both checkers in **parallel** using `Promise.all` and deduplicate results

---

### 3. Export API — `/api/export`

- Accept: original file buffer + array of corrections:

```ts
{
  original: string;
  replacement: string;
}
[];
```

- Apply find-and-replace in DOCX XML using `pizzip` + `docxtemplater`
- Return a downloadable `.docx` blob with proper `Content-Disposition` header

---

### 4. Frontend UI

- Step-based flow: **Upload → Processing → Review → Export**
- Side-by-side panels for US English vs UK English errors with a dialect toggle
- Misspelled words highlighted inline with a popover showing suggestions
- Bulk actions: "Accept All", "Ignore All" alongside per-word actions
- Progress indicator during processing (use React Suspense + streaming where applicable)
- Fully keyboard accessible and ARIA-labeled throughout

---

## Performance Requirements

- Dictionary singleton must be loaded **once at server startup**, reused across all requests
- Spell check on a 10,000-word document must complete in **under 500ms**
- Use `NextResponse` streaming for large documents to surface incremental results
- Use `React.memo` and `useMemo` to prevent re-renders in the word list UI

---

## Production Hardening

- Sanitize all inputs on every API route
- Rate limiting via middleware using `@upstash/ratelimit` or an in-memory limiter
- Error boundaries wrapping all async UI sections
- Structured error responses on all routes:

```ts
{
  error: string;
  code: string;
}
```

- Correct HTTP status codes throughout
- No external API keys or secrets required — fully self-contained
- Gracefully handle malformed, empty, or password-protected DOCX files without crashing

---

## Testing

- Unit test `spellChecker.ts` with known US vs UK word pairs:

| US English | UK English |
| ---------- | ---------- |
| color      | colour     |
| realize    | realise    |
| center     | centre     |
| organize   | organise   |
| traveling  | travelling |

- Integration test each Route Handler using `vitest` + `msw`
- Minimum **80% coverage** on all core `/lib` files

---

## Deliverables

1. Full Next.js project with all files implemented (not scaffolded or stubbed)
2. `README.md` with setup steps, architecture decisions, and local dev instructions
3. Sample `.docx` test file containing intentional US and UK spelling errors
4. `Dockerfile` for containerized production deployment

---

## Definition of Done

- [ ] Upload → Parse → Spell Check → Export flow works end to end
- [ ] US and UK dialects produce different error sets for dialect-specific words
- [ ] No runtime crashes on malformed or password-protected DOCX files
- [ ] Lighthouse performance score ≥ 90 on the main page
- [ ] Zero TypeScript errors in strict mode (`tsc --noEmit` passes clean)
- [ ] All API routes return structured errors — no unhandled promise rejections
- [ ] Rate limiting active and tested in middleware
