import { components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { R2, type R2Callbacks } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser } from "./_lib/auth";
import { assertUploadAllowed, claimUpload, validateUpload } from "./lib/uploads";

export const r2 = new R2(components.r2);
const callbacks: R2Callbacks = internal.starkResumeFiles;

const MAX_RESUME_BYTES = 8 * 1024 * 1024;
const RESUME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/octet-stream",
]);

/**
 * Students/teachers upload resume PDFs for Coach Mode.
 * Files go straight to R2; text is extracted client-side (or via extractText action).
 */
export const { generateUploadUrl, syncMetadata, onSyncMetadata } =
  r2.clientApi<DataModel>({
    checkUpload: async (ctx) => {
      await assertUploadAllowed(ctx);
    },
    // Runs inside `syncMetadata` with the uploader's auth: claim the key now
    // so the client can reference it as soon as the upload resolves.
    onUpload: async (ctx, _bucket, key) => {
      await claimUpload(ctx, key, "resume");
    },
    // Required for the component to actually invoke `onSyncMetadata` below.
    callbacks,
    onSyncMetadata: async (ctx, { key }) => {
      await validateUpload(ctx, r2, key, {
        maxBytes: MAX_RESUME_BYTES,
        contentTypes: RESUME_TYPES,
      });
    },
  });

export const getOwnedKey = query({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      kind: v.literal("resume"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db
      .query("uploadedObjects")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!row || row.userId !== user._id || row.kind !== "resume") return null;
    return { userId: row.userId, kind: "resume" as const };
  },
});
