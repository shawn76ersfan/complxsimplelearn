/**
 * Client-side PDF text extraction for Coach Mode.
 * Falls back to the Convex extractTextFromKey action if this fails.
 */
export async function extractPdfTextFromFile(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  if (totalPages > 8) {
    throw new Error("Resume PDFs are limited to 8 pages.");
  }

  const merged = Array.isArray(text) ? text.join("\n") : String(text);
  const cleaned = merged
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length < 40) {
    throw new Error(
      "Couldn't extract enough text from this PDF (it may be scanned). Paste the text instead.",
    );
  }

  return cleaned;
}
