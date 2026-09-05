import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrNull, requireAdmin, requireStaff } from "./_lib/auth";
import {
  assertCohortAccess,
  cohortIdsForUser,
  resolveCohortFilter,
  studentRecipients,
  visibleToStaff,
  visibleToStudent,
} from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";
import { notifyUsers } from "./lib/notify";

const announcementView = v.object({
  _id: v.id("announcements"),
  cohortId: v.optional(v.id("cohorts")),
  cohortName: v.optional(v.string()),
  cohortColor: v.optional(v.string()),
  title: v.string(),
  body: v.string(),
  pinned: v.boolean(),
  createdAt: v.number(),
  author: v.object({ _id: v.id("users"), name: v.string(), imageUrl: v.optional(v.string()) }),
  canDelete: v.boolean(),
});

/**
 * Announcements the signed-in user can read. Students: their cohorts plus
 * school-wide. Staff: their scope, optionally narrowed by the hub switcher.
 */
export const list = query({
  args: { cohortId: v.optional(v.id("cohorts")), limit: v.optional(v.number()) },
  returns: v.array(announcementView),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const all = await ctx.db.query("announcements").withIndex("by_created").order("desc").take(400);

    let rows;
    if (isStaffRole(me.role)) {
      const { scope, cohortId } = await resolveCohortFilter(ctx, me, args.cohortId);
      rows = visibleToStaff(all, scope, cohortId);
    } else {
      rows = visibleToStudent(all, await cohortIdsForUser(ctx, me._id));
    }

    rows.sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || b.createdAt - a.createdAt);

    const cohortCache = new Map<Id<"cohorts">, { name: string; color: string } | null>();
    const authorCache = new Map<Id<"users">, { _id: Id<"users">; name: string; imageUrl?: string }>();
    const out = [];
    for (const row of rows.slice(0, limit)) {
      let cohort: { name: string; color: string } | null = null;
      if (row.cohortId) {
        if (!cohortCache.has(row.cohortId)) {
          const c = await ctx.db.get(row.cohortId);
          cohortCache.set(row.cohortId, c ? { name: c.name, color: c.color } : null);
        }
        cohort = cohortCache.get(row.cohortId) ?? null;
      }
      if (!authorCache.has(row.authorId)) {
        const a = await ctx.db.get(row.authorId);
        authorCache.set(row.authorId, {
          _id: row.authorId,
          name: a?.name ?? "Instructor",
          imageUrl: a?.imageUrl,
        });
      }
      out.push({
        _id: row._id,
        cohortId: row.cohortId,
        cohortName: cohort?.name,
        cohortColor: cohort?.color,
        title: row.title,
        body: row.body,
        pinned: row.pinned ?? false,
        createdAt: row.createdAt,
        author: authorCache.get(row.authorId)!,
        canDelete: me.role === "admin" || row.authorId === me._id,
      });
    }
    return out;
  },
});

/** Post to one cohort (staff who teach it) or school-wide (admins). */
export const post = mutation({
  args: {
    cohortId: v.optional(v.id("cohorts")),
    title: v.string(),
    body: v.string(),
    pinned: v.optional(v.boolean()),
    emailStudents: v.optional(v.boolean()),
  },
  returns: v.id("announcements"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const body = args.body.trim();
    if (title.length < 2) throw new Error("Give the announcement a title");
    if (body.length < 2) throw new Error("Write something in the announcement");

    let author;
    let cohortName: string | undefined;
    if (args.cohortId) {
      author = await requireStaff(ctx);
      cohortName = (await assertCohortAccess(ctx, author, args.cohortId)).name;
    } else {
      author = await requireAdmin(ctx);
    }

    const id = await ctx.db.insert("announcements", {
      cohortId: args.cohortId,
      title,
      body,
      pinned: args.pinned ?? false,
      authorId: author._id,
      createdAt: Date.now(),
    });

    await notifyUsers(ctx, await studentRecipients(ctx, args.cohortId), {
      type: "announcement",
      title: cohortName ? `${cohortName}: ${title}` : title,
      body: body.length > 160 ? `${body.slice(0, 157).trimEnd()}…` : body,
      href: "/dashboard",
      actorId: author._id,
      dedupeKey: `announcement:${id}`,
      skipEmail: !(args.emailStudents ?? false),
    });
    return id;
  },
});

export const setPinned = mutation({
  args: { announcementId: v.id("announcements"), pinned: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const row = await ctx.db.get(args.announcementId);
    if (!row) throw new Error("Announcement not found");
    if (row.cohortId) await assertCohortAccess(ctx, staff, row.cohortId);
    else if (staff.role !== "admin") throw new Error("Admin access required");
    await ctx.db.patch(row._id, { pinned: args.pinned });
    return null;
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const row = await ctx.db.get(args.announcementId);
    if (!row) return null;
    if (staff.role !== "admin" && row.authorId !== staff._id) {
      throw new Error("Only the author or an admin can delete this");
    }
    await ctx.db.delete(row._id);
    return null;
  },
});
