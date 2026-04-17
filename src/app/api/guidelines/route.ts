export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { applyGuidelinesAndProofreadToDocx } from "@/lib/guidelineDocxWriter";
import type { Dialect } from "@/types";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const dialectValue = String(formData.get("dialect") || "uk").toLowerCase();
    const dialect = (["us", "uk", "both"].includes(dialectValue) ? dialectValue : "uk") as Dialect;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const isDocx =
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx");

    if (!isDocx) {
      return NextResponse.json(
        { error: "Invalid file type. Only DOCX files are supported.", code: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const transformedBuffer = await applyGuidelinesAndProofreadToDocx(originalBuffer, dialect);

    return new NextResponse(new Uint8Array(transformedBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="guideline-applied-${file.name}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Guideline export error:", error);
    return NextResponse.json(
      { error: "Failed to apply guidelines", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
