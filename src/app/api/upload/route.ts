export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { parseDocx } from "@/lib/docxParser";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to parse document";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided", code: "BAD_REQUEST" }, { status: 400 });
    }

    const isDocx = (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      || file.name.toLowerCase().endsWith(".docx")
    );
    const isPdf = (
      file.type === "application/pdf"
      || file.name.toLowerCase().endsWith(".pdf")
    );

    if (!isDocx && !isPdf) {
      return NextResponse.json({ error: "Invalid file type. Only DOCX and PDF are supported.", code: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isPdf) {
      const { parsePdfAndConvertToDocx } = await import("@/lib/pdfParser");
      const { parsedDoc, convertedDocxBuffer } = await parsePdfAndConvertToDocx(buffer);
      const baseName = file.name.replace(/\.pdf$/i, "");

      return NextResponse.json({
        ...parsedDoc,
        convertedDocxBase64: convertedDocxBuffer.toString("base64"),
        convertedFileName: `${baseName}.docx`,
      });
    }

    const parsedDoc = await parseDocx(buffer);

    return NextResponse.json(parsedDoc);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Upload error:", error);

    if (message.includes("Content-Type was not one of")) {
      return NextResponse.json({ error: "Invalid upload payload. Please send form-data with a file.", code: "BAD_REQUEST" }, { status: 400 });
    }

    if (message.includes("no readable text") || message.includes("must contain at least one image")) {
      return NextResponse.json({ error: message, code: "INVALID_PDF_CONTENT" }, { status: 400 });
    }

    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
