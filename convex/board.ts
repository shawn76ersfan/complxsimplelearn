import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./_lib/auth";
import { assertBoardAccess, canAccessBoard, cohortIdsForUser } from "./lib/cohortAccess";
import { rosterName } from "./lib/names";
import { isAdminRole } from "./lib/roles";

export const r2 = new R2(components.r2);

const MAX_BODY = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const RATE_WINDOW_MS = 20_000;
const RATE_MAX = 4;
const LIST_LIMIT = 80;

const authorReturn = v.object({
  _id: v.id("users"),
  name: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  state: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: v.union(v.literal("admin"), v.literal("teacher"), v.literal("student")),
});

const messageReturn = v.object({
  _id: v.id("boardMessages"),
  cohortId: v.id("cohorts"),
  authorId: v.id("users"),
  body: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  createdAt: v.number(),
  author: authorReturn,
});

export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await getCurrentUser(ctx);
  },
});

export const myBoards = query({
  args: {},
  returns: v.array(
    v.object({
      cohortId: v.id("cohorts"),
      name: v.string(),
      color: v.string(),
      code: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];

    if (isAdminRole(me.role)) {
      const cohorts = await ctx.db.query("cohorts").collect();
      return cohorts
        .filter((c) => c.status !== "archived")
        .map((c) => ({ cohortId: c._id, name: c.name, color: c.color, code: c.code }));
    }

    const ids = await cohortIdsForUser(ctx, me._id);
    const out = [];
    for (const id of ids) {
      const cohort = await ctx.db.get(id);
      if (!cohort || cohort.status === "archived") continue;
      out.push({ cohortId: cohort._id, name: cohort.name, color: cohort.color, code: cohort.code });
    }
    return out;
  },
});

export const list = query({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(messageReturn),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    if (!(await canAccessBoard(ctx, me, args.cohortId))) return [];

    const rows = await ctx.db
      .query("boardMessages")
      .withIndex("by_cohort_created", (q) => q.eq("cohortId", args.cohortId))
      .order("desc")
      .take(LIST_LIMIT);

    const messages = [];
    for (const row of rows.reverse()) {
      const author = await ctx.db.get(row.authorId);
      if (!author) continue;
      let imageUrl: string | null = null;
      if (row.imageKey) {
        try {
          imageUrl = await r2.getUrl(row.imageKey, { expiresIn: 60 * 60 * 12 });
        } catch {
          imageUrl = null;
        }
      }
      messages.push({
        _id: row._id,
        cohortId: row.cohortId,
        authorId: row.authorId,
        body: row.body,
        imageUrl,
        createdAt: row.createdAt,
        author: {
          _id: author._id,
          name: rosterName(author),
          firstName: author.firstName,
          lastName: author.lastName,
          state: author.state,
          imageUrl: author.imageUrl,
          role: author.role,
        },
      });
    }
    return messages;
  },
});

export const post = mutation({
  args: {
    cohortId: v.id("cohorts"),
    body: v.string(),
    imageKey: v.optional(v.string()),
    imageContentType: v.optional(v.string()),
    imageSize: v.optional(v.number()),
  },
  returns: v.id("boardMessages"),
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    await assertBoardAccess(ctx, me, args.cohortId);
    if (me.status === "dropped") throw new Error("Account is inactive");

    const first = me.firstName?.trim();
    const last = me.lastName?.trim();
    if (!first || !last) {
      throw new Error("Add your first and last name on your profile before posting");
    }
    if (me.role === "student" && !me.state?.trim()) {
      throw new Error("Add your state on your profile before posting");
    }

    const body = args.body.trim();
    if (!body && !args.imageKey) {
      throw new Error("Write a message or add a photo");
    }
    if (body.length > MAX_BODY) {
      throw new Error(`Messages can be ${MAX_BODY} characters at most`);
    }
    if (args.imageKey) {
      if (args.imageSize !== undefined && args.imageSize > MAX_IMAGE_BYTES) {
        throw new Error("Photos must be 5 MB or smaller");
      }
      if (args.imageContentType && !ALLOWED_IMAGE_TYPES.has(args.imageContentType)) {
        throw new Error("Use a JPG, PNG, GIF, or WebP photo");
      }
    }

    const recent = await ctx.db
      .query("boardMessages")
      .withIndex("by_author_created", (q) => q.eq("authorId", me._id))
      .order("desc")
      .take(RATE_MAX);
    const cutoff = Date.now() - RATE_WINDOW_MS;
    if (recent.length >= RATE_MAX && recent.every((m) => m.createdAt >= cutoff)) {
      throw new Error("Slow down — wait a few seconds before sending more");
    }

    return await ctx.db.insert("boardMessages", {
      cohortId: args.cohortId,
      authorId: me._id,
      body,
      imageKey: args.imageKey,
      imageContentType: args.imageContentType,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { messageId: v.id("boardMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    const row = await ctx.db.get(args.messageId);
    if (!row) return null;
    await assertBoardAccess(ctx, me, row.cohortId);
    if (row.authorId !== me._id && !isAdminRole(me.role)) {
      throw new Error("You can only remove your own posts");
    }
    if (row.imageKey) {
      try {
        await r2.deleteObject(ctx, row.imageKey);
      } catch {
        // ignore orphan cleanup
      }
    }
    await ctx.db.delete(args.messageId);
    return null;
  },
});

