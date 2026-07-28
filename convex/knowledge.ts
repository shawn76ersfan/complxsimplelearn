import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireTeacher } from "./_lib/auth";

/** List all knowledge docs, newest-updated first. Teacher-only. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireTeacher(ctx);
    return await ctx.db.query("knowledgeDocs").withIndex("by_updated").order("desc").collect();
  },
});

/** Create a knowledge doc and schedule a re-index of Stark's knowledge. */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.id("knowledgeDocs"),
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("knowledgeDocs", {
      title: args.title.trim(),
      content: args.content.trim(),
      category: args.category?.trim() || undefined,
      updatedBy: teacher._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.embeddings.rebuildAll, {});
    return id;
  },
});

/** Update a knowledge doc and schedule a re-index. */
export const update = mutation({
  args: {
    id: v.id("knowledgeDocs"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Knowledge doc not found");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      content: args.content.trim(),
      category: args.category?.trim() || undefined,
      updatedBy: teacher._id,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.embeddings.rebuildAll, {});
    return null;
  },
});

/** Delete a knowledge doc and schedule a re-index. */
export const remove = mutation({
  args: { id: v.id("knowledgeDocs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    await ctx.db.delete(args.id);
    await ctx.scheduler.runAfter(0, internal.embeddings.rebuildAll, {});
    return null;
  },
});
