import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { applyCorrections } from "@/lib/docxWriter";
import type { Correction } from "@/types";

async function createDocxBuffer(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun(text)],
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

async function extractRawText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

describe("applyCorrections", () => {
  it("applies token corrections without duplicated words", async () => {
    const text = "we have sen a huge explozion and bad advise.";
    const buffer = await createDocxBuffer(text);

    const corrections: Correction[] = [
      { original: "sen", replacement: "seen", paragraph: 0, index: text.indexOf("sen"), dialect: "uk" },
      { original: "explozion", replacement: "explosion", paragraph: 0, index: text.indexOf("explozion"), dialect: "uk" },
      { original: "advise", replacement: "advice", paragraph: 0, index: text.indexOf("advise"), dialect: "uk" },
    ];

    const corrected = await applyCorrections(buffer, corrections);
    const raw = await extractRawText(corrected);

    expect(raw).toContain("we have seen a huge explosion and bad advice.");
    expect(raw).not.toContain("sen seen");
    expect(raw).not.toContain("explozion explosion");
    expect(raw).not.toContain("advise advice");
  });

  it("guards against overlapping correction collisions", async () => {
    const text = "Use keyboard and mouse combo for now.";
    const buffer = await createDocxBuffer(text);

    const comboIndex = text.indexOf("combo");
    const corrections: Correction[] = [
      { original: "combo", replacement: "combination", paragraph: 0, index: comboIndex, dialect: "uk" },
      { original: "combo", replacement: "combo combination", paragraph: 0, index: comboIndex, dialect: "uk" },
    ];

    const corrected = await applyCorrections(buffer, corrections);
    const raw = await extractRawText(corrected);

    expect(raw).toContain("Use keyboard and mouse combination for now.");
    expect(raw).not.toContain("combocombination");
    expect(raw).not.toContain("combo combination");
  });
});
