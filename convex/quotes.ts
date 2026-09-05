import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const quotes = await ctx.db.query("quoteOfWeek").order("desc").first();
    return quotes ?? null;
  },
});

export const upsert = mutation({
  args: {
    text: v.string(),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireAdmin(ctx);
    const existing = await ctx.db.query("quoteOfWeek").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        text: args.text,
        author: args.author,
        updatedBy: teacher._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("quoteOfWeek", {
        text: args.text,
        author: args.author,
        updatedBy: teacher._id,
        updatedAt: Date.now(),
      });
    }
  },
});
