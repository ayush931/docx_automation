import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { Document, ImageRun, Packer, Paragraph } from "docx";
import { PNG } from "pngjs";
import { createWorker } from "tesseract.js";
import { ParsedDocument } from "@/types";

const execFileAsync = promisify(execFile);

function getTesseractPaths() {
  const projectRoot = process.cwd();

  return {
    workerPath: path.join(projectRoot, "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
    corePath: path.join(projectRoot, "node_modules", "tesseract.js-core", "tesseract-core.wasm.js"),
    cachePath: path.join(projectRoot, ".next", "cache", "tesseract"),
  };
}

type PageImage = {
  data: Uint8Array;
  width: number;
  height: number;
  type: "png";
};

type PdfToDocxResult = {
  parsedDoc: ParsedDocument;
  convertedDocxBuffer: Buffer;
};

function buildParagraphsFromText(rawText: string): string[] {
  return rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

async function renderPdfPagesAsPng(buffer: Buffer): Promise<PageImage[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-ocr-"));
  const inputPdfPath = path.join(tempDir, "input.pdf");
  const outputPrefix = path.join(tempDir, "page");

  try {
    await fs.writeFile(inputPdfPath, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "200", inputPdfPath, outputPrefix]);

    const files = await fs.readdir(tempDir);
    const pageFiles = files
      .filter((fileName) => /^page-\d+\.png$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const pageImages: PageImage[] = [];
    for (const pageFile of pageFiles) {
      const filePath = path.join(tempDir, pageFile);
      const data = await fs.readFile(filePath);
      const pngMeta = PNG.sync.read(data);

      pageImages.push({
        data: new Uint8Array(data),
        width: pngMeta.width,
        height: pngMeta.height,
        type: "png",
      });
    }

    return pageImages;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractOcrTextFromPages(pageImages: PageImage[]): Promise<string> {
  const tesseractPaths = getTesseractPaths();

  const worker = await createWorker("eng", undefined, {
    workerPath: tesseractPaths.workerPath,
    corePath: tesseractPaths.corePath,
    cachePath: tesseractPaths.cachePath,
    gzip: true,
    errorHandler: (error) => {
      console.error("Tesseract worker error:", error);
    },
  });

  try {
    const pageTexts: string[] = [];

    for (const image of pageImages) {
      const { data } = await worker.recognize(Buffer.from(image.data));
      const pageText = (data.text || "").trim();
      if (pageText.length > 0) {
        pageTexts.push(pageText);
      }
    }

    return pageTexts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

function buildDocxFromImages(pageImages: PageImage[]): Promise<Buffer> {
  const children: Paragraph[] = [];

  for (const image of pageImages) {
    const pageMaxWidth = 560;
    const scale = image.width > pageMaxWidth ? pageMaxWidth / image.width : 1;

    children.push(new Paragraph({
      children: [
        new ImageRun({
          data: image.data,
          type: image.type,
          transformation: {
            width: Math.max(1, Math.floor(image.width * scale)),
            height: Math.max(1, Math.floor(image.height * scale)),
          },
        }),
      ],
    }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

export async function parsePdfAndConvertToDocx(buffer: Buffer): Promise<PdfToDocxResult> {
  // Validate image presence by checking for PDF image object markers.
  const pdfBinary = buffer.toString("latin1");
  const hasImageObjects = /\/Subtype\s*\/Image/.test(pdfBinary);
  if (!hasImageObjects) {
    throw new Error("PDF must contain at least one image.");
  }

  const pageImages = await renderPdfPagesAsPng(buffer);
  if (pageImages.length === 0) {
    throw new Error("Unable to render PDF pages for OCR conversion.");
  }

  const rawText = (await extractOcrTextFromPages(pageImages)).trim();
  const paragraphs = buildParagraphsFromText(rawText);

  if (paragraphs.length === 0) {
    throw new Error("PDF has no readable text to spell check.");
  }

  const convertedDocxBuffer = await buildDocxFromImages(pageImages);

  return {
    parsedDoc: {
      paragraphs,
      rawText: paragraphs.join("\n"),
      wordCount: rawText ? rawText.split(/\s+/).length : 0,
    },
    convertedDocxBuffer,
  };
}
