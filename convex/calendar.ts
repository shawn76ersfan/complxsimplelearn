import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTeacher } from "./_lib/auth";
import { activeStudentIds, notifyUsers } from "./lib/notify";

export const listByMonth = query({
  args: { yearMonth: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const events = await ctx.db
      .query("calendarEvents")
      .collect();
    return events.filter((e) => e.date.startsWith(args.yearMonth));
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const id = await ctx.db.insert("calendarEvents", {
      date: args.date,
      title: args.title,
      description: args.description,
      color: args.color ?? "#7C3AED",
      createdBy: teacher._id,
    });

    // In-app only; teachers email the month's schedule explicitly from the calendar.
    await notifyUsers(ctx, await activeStudentIds(ctx), {
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
    await requireTeacher(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    await ctx.db.delete(args.id);
  },
});
