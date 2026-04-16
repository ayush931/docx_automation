import mammoth from "mammoth";
import { ParsedDocument } from "@/types";

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // Extract HTML to preserve paragraph structure
  const result = await mammoth.convertToHtml({
    buffer
  });

  const html = result.value;

  // Extract text from HTML paragraphs
  const paragraphs: string[] = [];
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
  let match;

  while ((match = paragraphRegex.exec(html)) !== null) {
    // Remove HTML tags from paragraph content
    const text = match[1]
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&lt;/g, '<')   // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();

    // Only add non-empty paragraphs
    if (text.length > 0) {
      paragraphs.push(text);
    }
  }

  // Fallback: if no paragraphs found, extract raw text and split
  if (paragraphs.length === 0) {
    const rawResult = await mammoth.extractRawText({ buffer });
    const rawText = rawResult.value;

    rawText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .forEach(p => paragraphs.push(p));
  }

  // Calculate word count from all paragraphs
  const rawText = paragraphs.join('\n');
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  return {
    paragraphs,
    rawText,
    wordCount,
  };
}
