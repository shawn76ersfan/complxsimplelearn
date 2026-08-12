"use node";

import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { extractText, getDocumentProxy } from "unpdf";

const r2 = new R2(components.r2);

const MAX_PAGES = 8;
const MIN_CHARS = 40;

/**
 * Server-side PDF text extraction for Coach Mode resumes stored in R2.
 * Kept in a "use node" file so unpdf/pdf.js can run; mutations stay elsewhere.
 */
export const extractTextFromKey = action({
  args: {
    key: v.string(),
  },
  returns: v.object({
    text: v.string(),
    pageCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let url: string;
    try {
      url = await r2.getUrl(args.key, { expiresIn: 60 * 10 });
    } catch {
      throw new Error("Could not access the uploaded PDF. Please try uploading again.");
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download PDF (${res.status}).`);
    }

    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.byteLength > 8 * 1024 * 1024) {
      throw new Error("PDF must be 8 MB or smaller.");
    }

    let pdf;
    try {
      pdf = await getDocumentProxy(buffer);
    } catch {
      throw new Error("Could not read that PDF. Try another file or paste the text.");
    }

    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    if (totalPages > MAX_PAGES) {
      throw new Error(`Resume PDFs are limited to ${MAX_PAGES} pages.`);
    }

    const merged = Array.isArray(text) ? text.join("\n") : String(text);
    const cleaned = merged
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length < MIN_CHARS) {
      throw new Error(
        "Couldn't extract enough text from this PDF (it may be a scanned image). Paste the resume text instead.",
      );
    }

    return { text: cleaned, pageCount: totalPages };
  },
});
