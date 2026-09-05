import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { activeStudentIds, notifyUsers } from "./lib/notify";
import {
  assertContentAccess,
  cohortIdsForUser,
  resolveCohortFilter,
  visibleToStaff,
  visibleToStudent,
} from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";

/**
 * Events in a month. Students see their cohorts' events plus school-wide ones;
 * staff see their scope, optionally narrowed by the hub switcher. Each event
 * carries the cohort's name/colour so the widget can badge it.
 */
export const listByMonth = query({
  args: { yearMonth: v.string(), cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    const all = (await ctx.db.query("calendarEvents").collect()).filter((e) =>
      e.date.startsWith(args.yearMonth),
    );

    let events;
    if (isStaffRole(me.role)) {
      const { scope, cohortId } = await resolveCohortFilter(ctx, me, args.cohortId);
      events = visibleToStaff(all, scope, cohortId);
    } else {
      events = visibleToStudent(all, await cohortIdsForUser(ctx, me._id));
    }

    const cohortNames = new Map<string, string>();
    const out = [];
    for (const e of events) {
      let cohortName: string | undefined;
      if (e.cohortId) {
        if (!cohortNames.has(e.cohortId)) {
          const c = await ctx.db.get(e.cohortId);
          cohortNames.set(e.cohortId, c?.name ?? "Cohort");
        }
        cohortName = cohortNames.get(e.cohortId);
      }
      out.push({ ...e, cohortName });
    }
    return out;
  },
});

/**
 * The next few events the viewer can see, from `today` (YYYY-MM-DD, passed by
 * the client so the query stays deterministic) onward. Powers the student
 * class page's "coming up" list.
 */
export const upcoming = query({
  args: { today: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("calendarEvents"),
      date: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      color: v.optional(v.string()),
      cohortId: v.optional(v.id("cohorts")),
      cohortName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const all = (await ctx.db.query("calendarEvents").collect()).filter((e) => e.date >= args.today);

    let events;
    if (isStaffRole(me.role)) {
      const { scope } = await resolveCohortFilter(ctx, me, undefined);
      events = visibleToStaff(all, scope, undefined);
    } else {
      events = visibleToStudent(all, await cohortIdsForUser(ctx, me._id));
    }
    events.sort((a, b) => a.date.localeCompare(b.date) || a._creationTime - b._creationTime);

    const cohortNames = new Map<string, string>();
    const out = [];
    for (const e of events.slice(0, limit)) {
      let cohortName: string | undefined;
      if (e.cohortId) {
        if (!cohortNames.has(e.cohortId)) {
          const c = await ctx.db.get(e.cohortId);
          cohortNames.set(e.cohortId, c?.name ?? "Cohort");
        }
        cohortName = cohortNames.get(e.cohortId);
      }
      out.push({
        _id: e._id,
        date: e.date,
        title: e.title,
        description: e.description,
        color: e.color,
        cohortId: e.cohortId,
        cohortName,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    cohortId: v.optional(v.id("cohorts")),
  },
  handler: async (ctx, args) => {
    const teacher = await requireStaff(ctx);
    await assertContentAccess(ctx, teacher, args.cohortId);
    const id = await ctx.db.insert("calendarEvents", {
      date: args.date,
      title: args.title,
      description: args.description,
      color: args.color ?? "#7C3AED",
      createdBy: teacher._id,
      cohortId: args.cohortId,
    });

    // In-app only; teachers email the month's schedule explicitly from the calendar.
    await notifyUsers(ctx, await activeStudentIds(ctx, args.cohortId), {
      type: "calendar_event",
      title: `${args.title} · ${formatEventDate(args.date)}`,
      body: args.description,
      href: "/profile",
      actorId: teacher._id,
      dedupeKey: `calendar_event:${id}`,
      skipEmail: true,
    });

    return id;
  },
});

function formatEventDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d, 12),
  );
}

export const update = mutation({
  args: {
    id: v.id("calendarEvents"),
    title: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");
    await assertContentAccess(ctx, staff, event.cohortId);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) return;
    await assertContentAccess(ctx, staff, event.cohortId);
    await ctx.db.delete(args.id);
  },
});
