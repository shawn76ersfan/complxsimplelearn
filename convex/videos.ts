import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser, requireTeacher } from "./_lib/auth";

export const r2 = new R2(components.r2);

/**
 * Consumed by the `useUploadFile` hook on the client. The file uploads straight
 * from the browser to Cloudflare R2 via a presigned URL, so there is no
 * 2-minute limit — multi-hour class recordings upload fine.
 *
 * `checkUpload` gates who may request an upload URL (teachers only).
 */
export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await requireTeacher(ctx);
  },
});

/**
 * Teacher-only: save video metadata after the file has finished uploading to R2.
 * `key` is the R2 object key returned by the upload hook.
 */
export const create = mutation({
  args: {
    key: v.string(),
    title: v.string(),
    recordedDate: v.string(),
    description: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  returns: v.id("videos"),
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);

    const title = args.title.trim();
    if (!title) throw new Error("Title is required");
    if (!args.recordedDate) throw new Error("Date is required");

    return await ctx.db.insert("videos", {
      key: args.key,
      title,
      recordedDate: args.recordedDate,
      description: args.description?.trim() || undefined,
      contentType: args.contentType,
      fileSize: args.fileSize,
      uploadedBy: teacher._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * List all videos with playable URLs, newest recording first.
 * Available to any authenticated user (students and teachers).
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("videos"),
      _creationTime: v.number(),
      title: v.string(),
      recordedDate: v.string(),
      description: v.optional(v.string()),
      key: v.string(),
      contentType: v.optional(v.string()),
      fileSize: v.optional(v.number()),
      uploadedBy: v.id("users"),
      createdAt: v.number(),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_recorded_date")
      .order("desc")
      .collect();

    return await Promise.all(
      videos.map(async (video) => {
        let url: string | null = null;
        try {
          // Long expiry so seeking through a multi-hour recording never breaks.
          url = await r2.getUrl(video.key, { expiresIn: 60 * 60 * 24 });
        } catch {
          // R2 not configured yet, or object missing — surface as unplayable.
          url = null;
        }
        return { ...video, url };
      })
    );
  },
});

/**
 * Teacher-only: delete a video and its stored file in R2.
 */
export const remove = mutation({
  args: { id: v.id("videos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const video = await ctx.db.get(args.id);
    if (!video) return null;
    try {
      await r2.deleteObject(ctx, video.key);
    } catch {
      // If R2 delete fails, still remove the DB row so it disappears from the UI.
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
