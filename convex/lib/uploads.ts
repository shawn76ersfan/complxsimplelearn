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

/**
 * Record who uploaded an R2 key. Call from the R2 client API's `onUpload`
 * hook: that runs inside the public `syncMetadata` mutation with the
 * uploader's auth, so the ownership row exists before `useUploadFile`
 * resolves on the client and later mutations can call `assertOwnedUpload`.
 *
 * R2 metadata (size, content type) is not in Convex yet at this point; the
 * component fetches it in a scheduled action. Validate it in
 * `validateUpload` from the `onSyncMetadata` callback.
 */
export async function claimUpload(
  ctx: MutationCtx,
  key: string,
  kind: UploadKind,
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

  await ctx.db.insert("uploadedObjects", {
    key,
    userId: user._id,
    kind,
    createdAt: Date.now(),
  });
}

/**
 * Enforce size / content-type limits once the component has synced the
 * object's metadata. Runs from the internal `onSyncMetadata` mutation (no
 * user auth on ctx). A violating object is deleted from R2 and its
 * ownership row removed so nothing downstream can reference it.
 */
export async function validateUpload(
  ctx: MutationCtx,
  r2: R2,
  key: string,
  limits: { maxBytes: number; contentTypes?: Set<string> },
): Promise<void> {
  const meta = await r2.getMetadata(ctx, key);
  const tooLarge = meta?.size !== undefined && meta.size > limits.maxBytes;
  const badType =
    limits.contentTypes !== undefined &&
    !!meta?.contentType &&
    !limits.contentTypes.has(meta.contentType);
  if (!tooLarge && !badType) return;

  const row = await ctx.db
    .query("uploadedObjects")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (row) await ctx.db.delete(row._id);
  try {
    await r2.deleteObject(ctx, key);
  } catch (err) {
    console.warn("Could not delete rejected upload", key, err);
  }
  console.warn(
    tooLarge ? "Rejected upload: too large" : "Rejected upload: bad content type",
    { key, size: meta?.size, contentType: meta?.contentType },
  );
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
