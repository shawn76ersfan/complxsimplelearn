import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./_lib/auth";
import type { Id } from "./_generated/dataModel";

// ── Queries ────────────────────────────────────────────────────────────────

/** List all conversations for the current user, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db
      .query("starkConversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Get all messages for a conversation (oldest first). */
export const getMessages = query({
  args: { conversationId: v.id("starkConversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    // Verify ownership
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) return [];
    return await ctx.db
      .query("starkMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
  },
});

// ── Mutations ──────────────────────────────────────────────────────────────

/** Create a new conversation and return its ID. */
export const create = mutation({
  args: {
    title: v.string(),
    mode: v.optional(v.union(v.literal("default"), v.literal("coach"))),
    careerTrack: v.optional(v.string()),
    jobLevel: v.optional(v.string()),
  },
  returns: v.id("starkConversations"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("starkConversations", {
      userId: user._id,
      title: args.title.trim().slice(0, 60) || "New conversation",
      createdAt: now,
      updatedAt: now,
      mode: args.mode,
      careerTrack: args.careerTrack,
      jobLevel: args.jobLevel,
    });
  },
});

/** Set Coach Mode metadata on a conversation. */
export const setCoachMeta = mutation({
  args: {
    conversationId: v.id("starkConversations"),
    mode: v.optional(v.union(v.literal("default"), v.literal("coach"))),
    careerTrack: v.optional(v.string()),
    jobLevel: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");
    const patch: {
      mode?: "default" | "coach";
      careerTrack?: string;
      jobLevel?: string;
      updatedAt: number;
    } = { updatedAt: Date.now() };
    if (args.mode !== undefined) patch.mode = args.mode;
    if (args.careerTrack !== undefined) patch.careerTrack = args.careerTrack;
    if (args.jobLevel !== undefined) patch.jobLevel = args.jobLevel;
    await ctx.db.patch(args.conversationId, patch);
    return null;
  },
});

/** Update a conversation's title and touch its updatedAt. */
export const updateTitle = mutation({
  args: { conversationId: v.id("starkConversations"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.conversationId, {
      title: args.title.trim().slice(0, 60) || "New conversation",
      updatedAt: Date.now(),
    });
  },
});

/** Append a single user message to a conversation. */
export const addMessage = mutation({
  args: {
    conversationId: v.id("starkConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");
    const now = Date.now();
    await ctx.db.insert("starkMessages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now });
  },
});

async function insertMessage(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"starkConversations">;
    userId: Id<"users">;
    role: "user" | "assistant";
    content: string;
    now: number;
  },
) {
  await ctx.db.insert("starkMessages", {
    conversationId: args.conversationId,
    userId: args.userId,
    role: args.role,
    content: args.content,
    createdAt: args.now,
  });
}

export const appendExchange = internalMutation({
  args: {
    conversationId: v.id("starkConversations"),
    userId: v.id("users"),
    userText: v.string(),
    assistantText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== args.userId) throw new Error("Not found");
    const now = Date.now();
    await insertMessage(ctx, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "user",
      content: args.userText,
      now,
    });
    await insertMessage(ctx, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: args.assistantText,
      now: now + 1,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now + 1 });
    return null;
  },
});

export const addAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("starkConversations"),
    userId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== args.userId) throw new Error("Not found");
    const now = Date.now();
    await insertMessage(ctx, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: args.content,
      now,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now });
    return null;
  },
});

/** Delete a conversation and all its messages. */
export const deleteConversation = mutation({
  args: { conversationId: v.id("starkConversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");
    // Delete all messages first
    const messages = await ctx.db
      .query("starkMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(args.conversationId);
  },
});
