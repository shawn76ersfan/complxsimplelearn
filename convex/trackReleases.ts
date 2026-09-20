import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireStaff } from "./_lib/auth";
import { contentInScope, teachingScope } from "./lib/cohortAccess";
import type { Id } from "./_generated/dataModel";

async function upsertCohortOpen(
  ctx: MutationCtx,
  args: {
    trackId: Id<"tracks">;
    cohortId: Id<"cohorts">;
    open: boolean;
    staffId: Id<"users">;
  },
) {
  const existing = await ctx.db
    .query("trackReleases")
    .withIndex("by_track_cohort", (q) =>
      q.eq("trackId", args.trackId).eq("cohortId", args.cohortId),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, {
      open: args.open,
      releasedBy: args.staffId,
      releasedAt: Date.now(),
    });
    return;
  }
  await ctx.db.insert("trackReleases", {
    trackId: args.trackId,
    cohortId: args.cohortId,
    open: args.open,
    releasedBy: args.staffId,
    releasedAt: Date.now(),
  });
}

/** Move leftover program-wide opens onto active cohorts only. */
async function confineSchoolWideToActive(ctx: MutationCtx, staffId: Id<"users">) {
  const schoolWide = await ctx.db
    .query("trackReleases")
    .withIndex("by_cohort", (q) => q.eq("cohortId", undefined))
    .collect();
  const openTracks = schoolWide.filter((row) => row.open);
  if (openTracks.length === 0) return 0;

  const active = await ctx.db
    .query("cohorts")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect();

  for (const row of openTracks) {
    for (const cohort of active) {
      await upsertCohortOpen(ctx, {
        trackId: row.trackId,
        cohortId: cohort._id,
        open: true,
        staffId,
      });
    }
    await ctx.db.patch(row._id, {
      open: false,
      releasedBy: staffId,
      releasedAt: Date.now(),
    });
  }
  return openTracks.length;
}

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

export const confineSchoolWideOpens = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const staff = await requireStaff(ctx);
    return await confineSchoolWideToActive(ctx, staff._id);
  },
});

export const setOpen = mutation({
  args: {
    trackId: v.id("tracks"),
    open: v.boolean(),
    cohortId: v.id("cohorts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track || !track.published) throw new Error("Track not found");

    const staff = await requireStaff(ctx);
    await confineSchoolWideToActive(ctx, staff._id);
    const scope = await teachingScope(ctx, staff);
    if (!contentInScope(scope, args.cohortId)) {
      throw new Error("You cannot open tracks for that cohort");
    }

    await upsertCohortOpen(ctx, {
      trackId: args.trackId,
      cohortId: args.cohortId,
      open: args.open,
      staffId: staff._id,
    });
    return null;
  },
});
