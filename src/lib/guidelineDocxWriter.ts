import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmldomElement } from "@xmldom/xmldom";
import PizZip from "pizzip";
import { parseDocx } from "@/lib/docxParser";
import { checkSpelling } from "@/lib/spellChecker";
import { applyCorrections } from "@/lib/docxWriter";
import type { Correction, Dialect } from "@/types";

function normalizeSpaces(text: string): string {
  return text.replace(/[ ]{2,}/g, " ");
}

function normalizeNumberSpans(text: string): string {
  // Convert numeric ranges like 10-12 or 10--12 to unspaced en dashes (10–12).
  return text.replace(/(\d)\s*(?:--|-|–|—)\s*(\d)/g, "$1\u2013$2");
}

function normalizeLyHyphenation(text: string): string {
  // Guideline: adverbs ending in "ly" should not be hyphenated with following adjectives/participles.
  return text.replace(/\b([A-Za-z]+ly)-([A-Za-z]+)\b/g, "$1 $2");
}

function normalizeStraightQuotes(text: string): string {
  // Convert straight quotes to typographic quotes with simple context heuristics.
  const singlePlaceholderOpen = "\uE000";
  const singlePlaceholderClose = "\uE001";
  const doublePlaceholderOpen = "\uE002";
  const doublePlaceholderClose = "\uE003";

  // Apostrophes inside words: don't -> don't (curly apostrophe)
  let result = text.replace(/([A-Za-z])'([A-Za-z])/g, "$1\u2019$2");

  // Single quotes
  result = result
    .replace(/(^|[\s([{\-–—])'(?=\S)/g, `$1${singlePlaceholderOpen}`)
    .replace(/'(?=[\s\])}\-–—.,;:!?]|$)/g, singlePlaceholderClose)
    .replace(/'/g, "\u2019")
    .replace(new RegExp(singlePlaceholderOpen, "g"), "\u2018")
    .replace(new RegExp(singlePlaceholderClose, "g"), "\u2019");

  // Double quotes
  result = result
    .replace(/(^|[\s([{\-–—])"(?=\S)/g, `$1${doublePlaceholderOpen}`)
    .replace(/"(?=[\s\])}\-–—.,;:!?]|$)/g, doublePlaceholderClose)
    .replace(/"/g, "\u201D")
    .replace(new RegExp(doublePlaceholderOpen, "g"), "\u201C")
    .replace(new RegExp(doublePlaceholderClose, "g"), "\u201D");

  return result;
}

function applyGuidelineTransformsToText(text: string): string {
  return [
    normalizeSpaces,
    normalizeNumberSpans,
    normalizeLyHyphenation,
    normalizeStraightQuotes,
  ].reduce((current, transform) => transform(current), text);
}

function shouldSkipParagraph(paragraphNode: XmldomElement): boolean {
  const paragraphStyleNodes = Array.from(paragraphNode.getElementsByTagName("w:pStyle")) as XmldomElement[];
  for (const styleNode of paragraphStyleNodes) {
    const styleValue = styleNode.getAttribute("w:val") || styleNode.getAttribute("val") || "";
    if (/^(TOC|TableOfContents|Contents)/i.test(styleValue)) {
      return true;
    }
  }

  const instrTextNodes = Array.from(paragraphNode.getElementsByTagName("w:instrText")) as XmldomElement[];
  if (instrTextNodes.some((node) => (node.textContent || "").includes("TOC"))) {
    return true;
  }

  const hyperlinkNodes = Array.from(paragraphNode.getElementsByTagName("w:hyperlink")) as XmldomElement[];
  return hyperlinkNodes.some((node) => {
    const anchor = node.getAttribute("w:anchor") || node.getAttribute("anchor") || "";
    return anchor.startsWith("_Toc");
  });
}

function applyGuidelineTransformsToParagraph(paragraphNode: XmldomElement): void {
  const textNodes = Array.from(paragraphNode.getElementsByTagName("w:t")) as XmldomElement[];

  for (const textNode of textNodes) {
    const currentText = textNode.textContent || "";
    const transformedText = applyGuidelineTransformsToText(currentText);

    if (transformedText !== currentText) {
      textNode.textContent = transformedText;
    }
  }
}

function applyGuidelineTransformsToXml(xml: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, "text/xml");
  const serializer = new XMLSerializer();

  if (!document || !document.documentElement || document.documentElement.nodeName === "parsererror") {
    throw new Error("Invalid DOCX XML content");
  }

  const paragraphs = Array.from(document.getElementsByTagName("w:p"));

  for (const paragraphNode of paragraphs) {
    if (shouldSkipParagraph(paragraphNode)) {
      continue;
    }

    applyGuidelineTransformsToParagraph(paragraphNode);
  }

  return serializer.serializeToString(document);
}

export async function applyGuidelinesToDocx(originalBuffer: Buffer): Promise<Buffer> {
  const zip = new PizZip(originalBuffer);
  const fileNames = Object.keys(zip.files);
  const guidelineTargetFiles = [
    "word/document.xml",
  ];

  const wordXmlFiles = guidelineTargetFiles.filter((name) => fileNames.includes(name));

  if (wordXmlFiles.length === 0) {
    throw new Error("Invalid DOCX: missing Word XML parts");
  }

  for (const xmlPath of wordXmlFiles) {
    const xml = zip.file(xmlPath)?.asText();
    if (!xml) {
      continue;
    }

    const transformedXml = applyGuidelineTransformsToXml(xml);
    if (transformedXml !== xml) {
      zip.file(xmlPath, transformedXml);
    }
  }

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

function buildAutoCorrectionsFromSpellErrors(
  errors: Awaited<ReturnType<typeof checkSpelling>>,
  dialect: Dialect
): Correction[] {
  const seen = new Set<string>();
  const usedPositions = new Set<string>();
  const corrections: Correction[] = [];

  for (const error of errors) {
    // Keep auto-apply deterministic and token-level to avoid grammar phrase corruption.
    if (error.type !== "spelling" && error.type !== "consistency") {
      continue;
    }

    const replacement = error.suggestions[0];
    if (!replacement || replacement === error.word) {
      continue;
    }

    // Reject noisy replacements (multi-word or punctuation-heavy suggestions) to prevent merge/duplication artifacts.
    if (replacement.includes(" ") || /[^A-Za-z'\-]/.test(replacement)) {
      continue;
    }

    const positionKey = `${error.paragraph}:${error.index}`;
    if (usedPositions.has(positionKey)) {
      continue;
    }

    const key = `${error.paragraph}:${error.index}:${error.word}:${replacement}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    usedPositions.add(positionKey);
    corrections.push({
      original: error.word,
      replacement,
      paragraph: error.paragraph,
      index: error.index,
      dialect: dialect === "both" ? error.dialect : dialect,
    });
  }

  return corrections;
}

export async function applyGuidelinesAndProofreadToDocx(
  originalBuffer: Buffer,
  dialect: Dialect = "uk"
): Promise<Buffer> {
  // First apply deterministic guideline transforms.
  const guidelineBuffer = await applyGuidelinesToDocx(originalBuffer);

  // Then run spell/punctuation/style checks and auto-apply best suggestions.
  const parsed = await parseDocx(guidelineBuffer);
  if (!parsed.rawText.trim()) {
    return guidelineBuffer;
  }

  // For automatic replacement, choose one concrete dialect to avoid cross-dialect conflicting edits.
  const correctionDialect: Dialect = dialect === "both" ? "uk" : dialect;
  const spellErrors = await checkSpelling(parsed.rawText, correctionDialect);
  const corrections = buildAutoCorrectionsFromSpellErrors(spellErrors, correctionDialect);

  if (corrections.length === 0) {
    return guidelineBuffer;
  }

  return applyCorrections(guidelineBuffer, corrections);
}
