export const dynamic = "force-dynamic";
export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { checkSpelling } from "@/lib/spellChecker";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, dialect } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing or invalid text", code: "BAD_REQUEST" }, { status: 400 });
    }

    if (!["us", "uk", "both"].includes(dialect)) {
      return NextResponse.json({ error: "Invalid dialect", code: "BAD_REQUEST" }, { status: 400 });
    }

    const errors = await checkSpelling(text, dialect as 'us' | 'uk' | 'both');

    return NextResponse.json({ errors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Spellcheck error:", message, stack);
    return NextResponse.json({ error: "Failed to process spell check", message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
