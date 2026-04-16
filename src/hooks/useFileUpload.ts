import { useRef, useState } from "react";
import { useSpellCheck } from "./useSpellCheck";

type UploadResponse = {
  paragraphs: string[];
  rawText: string;
  wordCount: number;
  convertedDocxBase64?: string;
  convertedFileName?: string;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { dialect, setFile, setParsedDoc, setErrors, clearCorrections, setIsProcessing } = useSpellCheck();

  const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    try {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (json && typeof json.error === "string") {
          return json.error;
        }
      }

      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  };

  const handleUpload = async (file: File) => {
    if (!file || isUploading) {
      return;
    }

    uploadIdRef.current += 1;
    const currentUploadId = uploadIdRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsUploading(true);
    setError(null);
    setIsProcessing(true);
    clearCorrections();
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 1. Upload and Parse
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!uploadRes.ok) {
        const uploadMessage = await readErrorMessage(uploadRes, "Failed to upload and parse file.");
        throw new Error(uploadMessage);
      }

      const uploadData: UploadResponse = await uploadRes.json();

      if (currentUploadId !== uploadIdRef.current) {
        return;
      }

      // Validate that document has content
      if (!uploadData.paragraphs || uploadData.paragraphs.length === 0 || !uploadData.rawText || uploadData.rawText.trim().length === 0) {
        throw new Error("Document has no content to check. Please upload a document with text.");
      }

      setParsedDoc({
        paragraphs: uploadData.paragraphs,
        rawText: uploadData.rawText,
        wordCount: uploadData.wordCount,
      });

      const workingFile = uploadData.convertedDocxBase64
        ? new File(
          [base64ToArrayBuffer(uploadData.convertedDocxBase64)],
          uploadData.convertedFileName || file.name.replace(/\.pdf$/i, ".docx"),
          { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
        )
        : file;

      // 2. Spell Check
      const spellCheckRes = await fetch("/api/spellcheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: uploadData.rawText,
          dialect,
        }),
        signal: controller.signal,
      });

      if (!spellCheckRes.ok) {
        const spellCheckMessage = await readErrorMessage(spellCheckRes, "Failed to check spelling.");
        throw new Error(spellCheckMessage);
      }

      const { errors } = await spellCheckRes.json();

      if (currentUploadId !== uploadIdRef.current) {
        return;
      }

      setFile(workingFile);
      setErrors(errors);

    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setFile(null);
      setParsedDoc(null);
      setErrors([]);
      setError(message);
    } finally {
      if (currentUploadId === uploadIdRef.current) {
        setIsUploading(false);
        setIsProcessing(false);
      }
    }
  };

  return { handleUpload, isUploading, error };
};
