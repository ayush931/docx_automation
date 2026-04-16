export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { applyCorrections } from "@/lib/docxWriter";
import { Correction } from "@/types";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const correctionsJson = formData.get("corrections") as string;

    if (!file || !correctionsJson) {
      return NextResponse.json({ error: "Missing file or corrections", code: "BAD_REQUEST" }, { status: 400 });
    }

    let corrections: Correction[] = [];
    try {
      corrections = JSON.parse(correctionsJson);
    } catch {
      return NextResponse.json({ error: "Invalid corrections format", code: "BAD_REQUEST" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const correctedBuffer = await applyCorrections(buffer, corrections);

    return new NextResponse(new Uint8Array(correctedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="corrected-${file.name}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export document", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
