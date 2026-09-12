import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { R2 } from "@convex-dev/r2";
import { getCurrentUser } from "../_lib/auth";

export type UploadKind = Doc<"uploadedObjects">["kind"];

const UPLOAD_WINDOW_MS = 20_000;
const UPLOAD_MAX = 8;

export async function assertUploadAllowed(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  const recent = await ctx.db
    .query("uploadedObjects")
    .withIndex("by_user_created", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(UPLOAD_MAX);
  const cutoff = Date.now() - UPLOAD_WINDOW_MS;
  if (recent.length >= UPLOAD_MAX && recent.every((row) => row.createdAt >= cutoff)) {
    throw new Error("Slow down — wait a few seconds before uploading more");
  }
  return user;
}

export async function claimUpload(
  ctx: MutationCtx,
  r2: R2,
  key: string,
  kind: UploadKind,
  limits: { maxBytes: number; contentTypes?: Set<string> },
): Promise<void> {
  const user = await getCurrentUser(ctx);
  const existing = await ctx.db
    .query("uploadedObjects")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing) {
    if (existing.userId !== user._id) throw new Error("Unauthorized");
    return;
  }

  const meta = await r2.getMetadata(ctx, key);
  if (meta?.size !== undefined && meta.size > limits.maxBytes) {
    try {
      await r2.deleteObject(ctx, key);
    } catch {
      // still reject the claim
    }
    throw new Error("File is too large");
  }
  if (
    limits.contentTypes &&
    meta?.contentType &&
    !limits.contentTypes.has(meta.contentType)
  ) {
    try {
      await r2.deleteObject(ctx, key);
    } catch {
      // still reject the claim
    }
    throw new Error("That file type is not allowed");
  }

  await ctx.db.insert("uploadedObjects", {
    key,
    userId: user._id,
    kind,
    createdAt: Date.now(),
  });
}

export async function assertOwnedUpload(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  key: string,
  kind?: UploadKind,
): Promise<Doc<"uploadedObjects">> {
  const row = await ctx.db
    .query("uploadedObjects")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row || row.userId !== userId || (kind && row.kind !== kind)) {
    throw new Error("Invalid file");
  }
  return row;
}
