import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireStaff } from "./_lib/auth";
import { contentInScope, teachingScope } from "./lib/cohortAccess";

const hubTrack = v.object({
  _id: v.id("tracks"),
  name: v.string(),
  slug: v.string(),
  color: v.string(),
  icon: v.string(),
  order: v.number(),
  cohortOpen: v.boolean(),
  schoolWideOpen: v.boolean(),
});

export const listForHub = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  returns: v.array(hubTrack),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const scope = await teachingScope(ctx, staff);
    if (!contentInScope(scope, args.cohortId)) return [];

    const tracks = (
      await ctx.db
        .query("tracks")
        .withIndex("by_published", (q) => q.eq("published", true))
        .collect()
    ).sort((a, b) => a.order - b.order);

    const schoolWide = await ctx.db
      .query("trackReleases")
      .withIndex("by_cohort", (q) => q.eq("cohortId", undefined))
      .collect();
    const schoolMap = new Map(schoolWide.map((row) => [row.trackId, row.open]));

    const cohortRows = args.cohortId
      ? await ctx.db
          .query("trackReleases")
          .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
          .collect()
      : [];
    const cohortMap = new Map(cohortRows.map((row) => [row.trackId, row.open]));

    return tracks.map((track) => ({
      _id: track._id,
      name: track.name,
      slug: track.slug,
      color: track.color,
      icon: track.icon,
      order: track.order,
      cohortOpen: args.cohortId ? (cohortMap.get(track._id) ?? false) : false,
      schoolWideOpen: schoolMap.get(track._id) ?? false,
    }));
  },
});

export const setOpen = mutation({
  args: {
    trackId: v.id("tracks"),
    open: v.boolean(),
    cohortId: v.optional(v.id("cohorts")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track || !track.published) throw new Error("Track not found");

    if (args.cohortId === undefined) {
      const admin = await requireAdmin(ctx);
      const existing = await ctx.db
        .query("trackReleases")
        .withIndex("by_track_cohort", (q) =>
          q.eq("trackId", args.trackId).eq("cohortId", undefined),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          open: args.open,
          releasedBy: admin._id,
          releasedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("trackReleases", {
          trackId: args.trackId,
          open: args.open,
          releasedBy: admin._id,
          releasedAt: Date.now(),
        });
      }
      return null;
    }

    const staff = await requireStaff(ctx);
    const scope = await teachingScope(ctx, staff);
    if (!contentInScope(scope, args.cohortId)) {
      throw new Error("You cannot open tracks for that cohort");
    }

    const existing = await ctx.db
      .query("trackReleases")
      .withIndex("by_track_cohort", (q) =>
        q.eq("trackId", args.trackId).eq("cohortId", args.cohortId),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        open: args.open,
        releasedBy: staff._id,
        releasedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("trackReleases", {
        trackId: args.trackId,
        cohortId: args.cohortId,
        open: args.open,
        releasedBy: staff._id,
        releasedAt: Date.now(),
      });
    }
    return null;
  },
});
