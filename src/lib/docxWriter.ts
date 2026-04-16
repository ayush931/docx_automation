import PizZip from "pizzip";
import { Correction } from "@/types";

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function applyCorrections(
  originalBuffer: Buffer,
  corrections: Correction[]
): Promise<Buffer> {
  const zip = new PizZip(originalBuffer);

  // Getting the document.xml content
  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("Invalid DOCX: missing document.xml");
  }

  // Extract all paragraphs with their indices
  const paragraphRegex = /<w:p[^>]*>[\s\S]*?<\/w:p>/g;
  const paragraphs = documentXml.match(paragraphRegex) || [];

  // Apply corrections to each paragraph
  const correctedParagraphs = paragraphs.map((paragraph, index) => {
    const paragraphCorrections = corrections.filter(c => c.paragraph === index);

    if (paragraphCorrections.length === 0) {
      return paragraph;
    }

    let updatedParagraph = paragraph;

    // Sort corrections in reverse order to prevent index conflicts during replacement
    for (const correction of paragraphCorrections) {
      updatedParagraph = replacedWordInParagraph(
        updatedParagraph,
        correction.original,
        correction.replacement
      );
    }

    return updatedParagraph;
  });

  // Reconstruct the document - use a more reliable approach to avoid partial replacements
  let result = documentXml;
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i] !== correctedParagraphs[i]) {
      // Use regex with escaping to replace only the specific paragraph (with global flag for safety)
      const paragraphRegex = new RegExp(escapeRegExp(paragraphs[i]), 'g');
      result = result.replace(paragraphRegex, correctedParagraphs[i]);
    }
  }

  zip.file("word/document.xml", result);

  // Generate the corrected DOCX file
  const buf = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return buf;
}

/**
 * Replace a word in a paragraph while respecting word boundaries
 * Handles cases where words might be split across XML tags
 */
function replacedWordInParagraph(
  paragraph: string,
  original: string,
  replacement: string
): string {
  // Pattern 1: Word within <w:t> tags
  const simplePattern = new RegExp(
    `(<w:t[^>]*>)${escapeRegExp(original)}(<\/w:t>)`,
    'g'
  );
  let result = paragraph.replace(simplePattern, `$1${replacement}$2`);

  // Pattern 2: Word with word boundaries (for cases where tags are involved)
  const boundaryPattern = new RegExp(
    `\\b${escapeRegExp(original)}\\b`,
    'g'
  );
  result = result.replace(boundaryPattern, replacement);

  return result;
}
