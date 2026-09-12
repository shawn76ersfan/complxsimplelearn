import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./_lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    return await ctx.db
      .query("tracks")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return track?.published ? track : null;
  },
});
