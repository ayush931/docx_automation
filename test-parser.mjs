import mammoth from "mammoth";
import fs from "fs";

async function test() {
  try {
    const buffer = fs.readFileSync("sample.docx");
    const result = await mammoth.extractRawText({ buffer });
    console.log("Extracted text:", result.value);
    console.log("Success!");
  } catch (error) {
    console.error("Error parsing DOCX:", error);
  }
}

test();
