import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./_lib/auth";
import { isStaffUser, openTrackIdSet } from "./lib/trackAccess";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const published = await ctx.db
      .query("tracks")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const staff = isStaffUser(user);
    const openIds = staff ? null : await openTrackIdSet(ctx, user._id);
    return published.map((track) => ({
      ...track,
      open: staff || (openIds?.has(track._id) ?? false),
    }));
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
    if (!track?.published) return null;
    const open = await (async () => {
      if (isStaffUser(user)) return true;
      return (await openTrackIdSet(ctx, user._id)).has(track._id);
    })();
    return { ...track, open };
  },
});
