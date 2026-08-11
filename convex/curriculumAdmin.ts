import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTeacher } from "./_lib/auth";

const lessonType = v.union(
  v.literal("content"),
  v.literal("quiz"),
  v.literal("game"),
  v.literal("mandatory"),
);

const trackReturn = v.object({
  _id: v.id("tracks"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  color: v.string(),
  icon: v.string(),
  order: v.number(),
  published: v.boolean(),
  lessonCount: v.number(),
});

const lessonReturn = v.object({
  _id: v.id("lessons"),
  _creationTime: v.number(),
  trackId: v.id("tracks"),
  title: v.string(),
  content: v.string(),
  type: lessonType,
  order: v.number(),
  published: v.boolean(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function validateBlocksJson(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return JSON.stringify({ blocks: [] });
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Lesson content must be valid JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { blocks?: unknown }).blocks)
  ) {
    throw new Error('Lesson content must be { "blocks": [...] }');
  }
  return JSON.stringify(parsed);
}

/** Teacher: all tracks including drafts, with lesson counts. */
export const listTracks = query({
  args: {},
  returns: v.array(trackReturn),
  handler: async (ctx) => {
    await requireTeacher(ctx);
    const tracks = await ctx.db.query("tracks").collect();
    tracks.sort((a, b) => a.order - b.order);
    return await Promise.all(
      tracks.map(async (t) => {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_track", (q) => q.eq("trackId", t._id))
          .collect();
        return { ...t, lessonCount: lessons.length };
      }),
    );
  },
});

/** Teacher: all lessons for a track (published + draft). */
export const listLessons = query({
  args: { trackId: v.id("tracks") },
  returns: v.array(lessonReturn),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();
    lessons.sort((a, b) => a.order - b.order);
    return lessons;
  },
});

export const getLesson = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(lessonReturn, v.null()),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    return await ctx.db.get(args.lessonId);
  },
});

export const createTrack = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    color: v.string(),
    icon: v.string(),
    published: v.optional(v.boolean()),
  },
  returns: v.id("tracks"),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");

    let slug = slugify(name);
    if (!slug) slug = `track-${Date.now()}`;

    const existing = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const all = await ctx.db.query("tracks").collect();
    const order = all.reduce((max, t) => Math.max(max, t.order), 0) + 1;

    return await ctx.db.insert("tracks", {
      name,
      slug,
      description: args.description.trim(),
      color: args.color.trim() || "#2563EB",
      icon: args.icon.trim() || "book",
      order,
      published: args.published ?? false,
    });
  },
});

export const updateTrack = mutation({
  args: {
    trackId: v.id("tracks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    published: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    const patch: Partial<typeof track> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Name is required");
      patch.name = name;
    }
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.color !== undefined) patch.color = args.color.trim() || track.color;
    if (args.icon !== undefined) patch.icon = args.icon.trim() || track.icon;
    if (args.published !== undefined) patch.published = args.published;
    if (args.order !== undefined) patch.order = args.order;

    await ctx.db.patch(args.trackId, patch);
    return null;
  },
});

export const removeTrack = mutation({
  args: { trackId: v.id("tracks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();
    for (const lesson of lessons) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
        .collect();
      for (const q of questions) await ctx.db.delete(q._id);
      await ctx.db.delete(lesson._id);
    }
    await ctx.db.delete(args.trackId);
    return null;
  },
});

export const createLesson = mutation({
  args: {
    trackId: v.id("tracks"),
    title: v.string(),
    type: lessonType,
    content: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  returns: v.id("lessons"),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    const title = args.title.trim();
    if (!title) throw new Error("Title is required");

    const siblings = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();
    const order = siblings.reduce((max, l) => Math.max(max, l.order), 0) + 1;

    return await ctx.db.insert("lessons", {
      trackId: args.trackId,
      title,
      content: validateBlocksJson(args.content ?? ""),
      type: args.type,
      order,
      published: args.published ?? false,
    });
  },
});

export const updateLesson = mutation({
  args: {
    lessonId: v.id("lessons"),
    title: v.optional(v.string()),
    type: v.optional(lessonType),
    content: v.optional(v.string()),
    published: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const patch: {
      title?: string;
      type?: typeof lesson.type;
      content?: string;
      published?: boolean;
      order?: number;
    } = {};

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) throw new Error("Title is required");
      patch.title = title;
    }
    if (args.type !== undefined) patch.type = args.type;
    if (args.content !== undefined) patch.content = validateBlocksJson(args.content);
    if (args.published !== undefined) patch.published = args.published;
    if (args.order !== undefined) patch.order = args.order;

    await ctx.db.patch(args.lessonId, patch);
    return null;
  },
});

export const removeLesson = mutation({
  args: { lessonId: v.id("lessons") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();
    for (const q of questions) await ctx.db.delete(q._id);
    await ctx.db.delete(args.lessonId);
    return null;
  },
});

export const reorderLessons = mutation({
  args: {
    trackId: v.id("tracks"),
    lessonIds: v.array(v.id("lessons")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    for (let i = 0; i < args.lessonIds.length; i++) {
      const lesson = await ctx.db.get(args.lessonIds[i]);
      if (!lesson || lesson.trackId !== args.trackId) continue;
      await ctx.db.patch(args.lessonIds[i], { order: i + 1 });
    }
    return null;
  },
});
