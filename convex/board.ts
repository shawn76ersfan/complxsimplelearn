import { mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";
import { R2, type R2Callbacks } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./_lib/auth";
import {
  assertBoardAccess,
  canAccessBoard,
  cohortIdsForUser,
  staffRecipients,
  studentRecipients,
} from "./lib/cohortAccess";
import { rosterName } from "./lib/names";
import { isAdminRole, isStaffRole } from "./lib/roles";
import { notifyUsers } from "./lib/notify";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertOwnedUpload,
  assertUploadAllowed,
  claimUpload,
  validateUpload,
} from "./lib/uploads";

export const r2 = new R2(components.r2);
const callbacks: R2Callbacks = internal.board;

const MAX_BODY = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const RATE_WINDOW_MS = 20_000;
const RATE_MAX = 4;
const PAGE_SIZE = 40;
const PAGE_MAX = 200;
const PIN_MAX = 3;

const authorReturn = v.object({
  _id: v.id("users"),
  name: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  state: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: v.union(v.literal("admin"), v.literal("teacher"), v.literal("student")),
});

const replyToReturn = v.object({
  _id: v.id("boardMessages"),
  authorName: v.string(),
  preview: v.string(),
});

const messageReturn = v.object({
  _id: v.id("boardMessages"),
  cohortId: v.id("cohorts"),
  authorId: v.id("users"),
  body: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  createdAt: v.number(),
  pinned: v.boolean(),
  parentId: v.optional(v.id("boardMessages")),
  replyTo: v.union(replyToReturn, v.null()),
  author: authorReturn,
});

async function hydrateMessages(
  ctx: QueryCtx,
  rows: Doc<"boardMessages">[],
): Promise<
  Array<{
    _id: Id<"boardMessages">;
    cohortId: Id<"cohorts">;
    authorId: Id<"users">;
    body: string;
    imageUrl: string | null;
    createdAt: number;
    pinned: boolean;
    parentId?: Id<"boardMessages">;
    replyTo: { _id: Id<"boardMessages">; authorName: string; preview: string } | null;
    author: {
      _id: Id<"users">;
      name: string;
      firstName?: string;
      lastName?: string;
      state?: string;
      imageUrl?: string;
      role: "admin" | "teacher" | "student";
    };
  }>
> {
  const messages = [];
  for (const row of rows) {
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
    let replyTo: { _id: Id<"boardMessages">; authorName: string; preview: string } | null = null;
    if (row.parentId) {
      const parent = await ctx.db.get(row.parentId);
      if (parent) {
        const parentAuthor = await ctx.db.get(parent.authorId);
        replyTo = {
          _id: parent._id,
          authorName: parentAuthor ? rosterName(parentAuthor) : "Classmate",
          preview: parent.body.trim()
            ? parent.body.trim().slice(0, 80)
            : parent.imageKey
              ? "Photo"
              : "Original post",
        };
      } else {
        replyTo = { _id: row.parentId, authorName: "Classmate", preview: "Original post removed" };
      }
    }
    messages.push({
      _id: row._id,
      cohortId: row.cohortId,
      authorId: row.authorId,
      body: row.body,
      imageUrl,
      createdAt: row.createdAt,
      pinned: row.pinned === true,
      parentId: row.parentId,
      replyTo,
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
}

export const { generateUploadUrl, syncMetadata, onSyncMetadata } =
  r2.clientApi<DataModel>({
    checkUpload: async (ctx) => {
      await assertUploadAllowed(ctx);
    },
    onUpload: async (ctx, _bucket, key) => {
      await claimUpload(ctx, key, "board");
    },
    callbacks,
    onSyncMetadata: async (ctx, { key }) => {
      await validateUpload(ctx, r2, key, {
        maxBytes: MAX_IMAGE_BYTES,
        contentTypes: ALLOWED_IMAGE_TYPES,
      });
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
  args: {
    cohortId: v.id("cohorts"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    pinned: v.array(messageReturn),
    messages: v.array(messageReturn),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = { pinned: [], messages: [], hasMore: false };
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return empty;
    if (!(await canAccessBoard(ctx, me, args.cohortId))) return empty;

    const limit = Math.min(Math.max(args.limit ?? PAGE_SIZE, 10), PAGE_MAX);
    const recent = await ctx.db
      .query("boardMessages")
      .withIndex("by_cohort_created", (q) => q.eq("cohortId", args.cohortId))
      .order("desc")
      .take(limit + 1);
    const hasMore = recent.length > limit;
    const page = hasMore ? recent.slice(0, limit) : recent;

    const pinnedRows = (
      await ctx.db
        .query("boardMessages")
        .withIndex("by_cohort_pinned", (q) =>
          q.eq("cohortId", args.cohortId).eq("pinned", true),
        )
        .order("desc")
        .take(PIN_MAX)
    ).reverse();

    return {
      pinned: await hydrateMessages(ctx, pinnedRows),
      messages: await hydrateMessages(ctx, page.reverse()),
      hasMore,
    };
  },
});

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", me._id).eq("isRead", false))
      .take(80);
    return unread.filter((n) => n.type === "board_post").length;
  },
});

export const post = mutation({
  args: {
    cohortId: v.id("cohorts"),
    body: v.string(),
    imageKey: v.optional(v.string()),
    imageContentType: v.optional(v.string()),
    imageSize: v.optional(v.number()),
    parentId: v.optional(v.id("boardMessages")),
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
      await assertOwnedUpload(ctx, me._id, args.imageKey, "board");
      const meta = await r2.getMetadata(ctx, args.imageKey);
      if (meta?.size !== undefined && meta.size > MAX_IMAGE_BYTES) {
        throw new Error("Photos must be 5 MB or smaller");
      }
      if (meta?.contentType && !ALLOWED_IMAGE_TYPES.has(meta.contentType)) {
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

    let parentId: Id<"boardMessages"> | undefined;
    let parentAuthorId: Id<"users"> | undefined;
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.cohortId !== args.cohortId) {
        throw new Error("That post is gone");
      }
      parentId = parent._id;
      parentAuthorId = parent.authorId;
    }

    const id = await ctx.db.insert("boardMessages", {
      cohortId: args.cohortId,
      authorId: me._id,
      body,
      imageKey: args.imageKey,
      imageContentType: args.imageContentType,
      createdAt: Date.now(),
      parentId,
    });

    const snippet = body
      ? body.length > 140
        ? `${body.slice(0, 137).trimEnd()}…`
        : body
      : "Posted a photo";
    const students = await studentRecipients(ctx, args.cohortId);
    const staff = await staffRecipients(ctx, args.cohortId);
    const recipients = new Set<Id<"users">>([...students, ...staff]);
    if (parentAuthorId) recipients.add(parentAuthorId);

    await notifyUsers(ctx, recipients, {
      type: "board_post",
      title: parentId
        ? `${rosterName(me)} replied on the Board`
        : `${rosterName(me)} posted on the Board`,
      body: snippet,
      href: "/board",
      actorId: me._id,
      skipEmail: true,
    });

    return id;
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
    if (row.authorId !== me._id && !isStaffRole(me.role)) {
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

export const setPinned = mutation({
  args: {
    messageId: v.id("boardMessages"),
    pinned: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!isStaffRole(me.role)) throw new Error("Only instructors can pin posts");
    const row = await ctx.db.get(args.messageId);
    if (!row) throw new Error("Post not found");
    await assertBoardAccess(ctx, me, row.cohortId);

    if (args.pinned) {
      const already = await ctx.db
        .query("boardMessages")
        .withIndex("by_cohort_pinned", (q) =>
          q.eq("cohortId", row.cohortId).eq("pinned", true),
        )
        .take(PIN_MAX);
      if (already.length >= PIN_MAX && !already.some((p) => p._id === row._id)) {
        throw new Error(`You can pin up to ${PIN_MAX} posts`);
      }
    }

    await ctx.db.patch(args.messageId, { pinned: args.pinned });
    return null;
  },
});

