# DOCX Spell Checker Web Tool

A production-ready, web-based DOCX spell checker built with Next.js 14+ (App Router).

## Features

- Upload `.docx` files via drag-and-drop or file picker.
- Extracts raw text while preserving paragraph structure.
- Spell checking against US English and UK English dictionaries independently or simultaneously.
- Diff-style UI showing misspelled words with suggestions for both dialects.
- Inline accept, ignore, or custom replace functionalities.
- Export the corrected `.docx` file with changes applied seamlessly.
- Robust API with rate limiting built for edge environments.
- Self-contained – requires no external API keys or secrets.

## Tech Stack

- **Framework**: Next.js 14+ App Router, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **DOCX Parsing**: `mammoth`
- **DOCX Writing**: `pizzip` + `docxtemplater`
- **Spell Check Engine**: `nspell` (with `dictionary-en-us` and `dictionary-en-gb`)
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library + MSW

## Setup & Local Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Run Tests**

   ```bash
   npm run test
   ```

4. **Generate a Sample Document**
   A sample document containing US and UK spelling variations is available. To generate it, you can run the provided node script:
   ```bash
   node generate-sample.js
   ```

## Architecture Decisions

- **Singleton Dictionaries:** Dictionary instances for `nspell` are loaded once and maintained as a singleton in the Node/Next server instance. This avoids high memory consumption and parsing time per request.
- **Edge Rate Limiting:** A lightweight, dependency-free in-memory rate limiter is implemented in the middleware. While isolated to its execution context, it provides robust defense against basic abuse without requiring Redis or Upstash.
- **Client-Side State Management:** Zustand is employed to handle the complex UI state of tracking user corrections, accepted suggestions, and dialect toggling without excessive prop drilling. It is minimal and perfectly scoped to the spellcheck session.
- **DOCX Find and Replace:** The `applyCorrections` process takes a fast, direct approach by performing regex-based text replacements on `document.xml` using `pizzip`, bypassing complex templating requirements and ensuring word-level corrections are precise and safe.

## Docker Deployment

A `Dockerfile` is included for containerized production deployment.

```bash
docker build -t docx-spellchecker .
docker run -p 3000:3000 docx-spellchecker
```

## Build Windows EXE

The project can be packaged as a Windows executable launcher.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the executable package:
   ```bash
   npm run build:exe
   ```

Output is created in `dist/windows`:

- `SpellCheckAutomation.exe`
- `app/` (required runtime files)

Keep `SpellCheckAutomation.exe` and the `app/` folder together in the same directory.
By default, it runs on port `3000`.

## Definition of Done

- ✅ Upload → Parse → Spell Check → Export flow works end to end
- ✅ US and UK dialects produce different error sets
- ✅ No runtime crashes on malformed files
- ✅ Zero TypeScript errors
- ✅ APIs return structured errors
- ✅ Rate limiting active in middleware
