import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireTeacher } from "./_lib/auth";

const publicSessionValidator = v.object({
  _id: v.id("infoSessions"),
  title: v.string(),
  description: v.optional(v.string()),
  startsAt: v.number(),
  timezone: v.string(),
});

const teacherSessionValidator = v.object({
  _id: v.id("infoSessions"),
  title: v.string(),
  description: v.optional(v.string()),
  startsAt: v.number(),
  timezone: v.string(),
  meetingUrl: v.optional(v.string()),
  published: v.boolean(),
  registrationCount: v.number(),
});

const reminderDataValidator = v.object({
  registrationId: v.id("infoSessionRegistrations"),
  name: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("cancelled")),
  confirmationSentAt: v.optional(v.number()),
  reminderSentAt: v.optional(v.number()),
  sessionId: v.id("infoSessions"),
  title: v.string(),
  description: v.optional(v.string()),
  startsAt: v.number(),
  timezone: v.string(),
  meetingUrl: v.optional(v.string()),
  published: v.boolean(),
});

function cleanText(value: string, field: string, maxLength: number): string {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${field} is required`);
  if (cleaned.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }
  return cleaned;
}

function cleanOptionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return cleanText(value, field, maxLength);
}

function cleanMeetingUrl(value: string | undefined): string | undefined {
  const cleaned = cleanOptionalText(value, "Meeting URL", 500);
  if (!cleaned) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("Meeting URL must be a valid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Meeting URL must start with https:// or http://");
  }
  return parsed.toString();
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("Enter a valid email address");
  }
  return normalized;
}

function validateTimezone(timezone: string): string {
  const cleaned = cleanText(timezone, "Timezone", 100);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned }).format(0);
  } catch {
    throw new Error("Enter a valid timezone");
  }
  return cleaned;
}

export const listPublic = query({
  args: { now: v.number() },
  returns: v.array(publicSessionValidator),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("infoSessions")
      .withIndex("by_published_start", (q) =>
        q.eq("published", true).gte("startsAt", args.now),
      )
      .order("asc")
      .take(20);

    return sessions.map((session) => ({
      _id: session._id,
      title: session.title,
      description: session.description,
      startsAt: session.startsAt,
      timezone: session.timezone,
    }));
  },
});

export const listForTeacher = query({
  args: {},
  returns: v.array(teacherSessionValidator),
  handler: async (ctx) => {
    await requireTeacher(ctx);
    const sessions = await ctx.db
      .query("infoSessions")
      .withIndex("by_start")
      .order("desc")
      .take(100);

    return await Promise.all(
      sessions.map(async (session) => {
        const registrations = await ctx.db
          .query("infoSessionRegistrations")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(500);
        return {
          _id: session._id,
          title: session.title,
          description: session.description,
          startsAt: session.startsAt,
          timezone: session.timezone,
          meetingUrl: session.meetingUrl,
          published: session.published,
          registrationCount: registrations.filter(
            (registration) => registration.status === "active",
          ).length,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    timezone: v.string(),
    meetingUrl: v.optional(v.string()),
    published: v.boolean(),
  },
  returns: v.id("infoSessions"),
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    if (!Number.isFinite(args.startsAt) || args.startsAt <= Date.now()) {
      throw new Error("Info session must be scheduled in the future");
    }
    const now = Date.now();
    return await ctx.db.insert("infoSessions", {
      title: cleanText(args.title, "Title", 120),
      description: cleanOptionalText(args.description, "Description", 1000),
      startsAt: args.startsAt,
      timezone: validateTimezone(args.timezone),
      meetingUrl: cleanMeetingUrl(args.meetingUrl),
      published: args.published,
      createdBy: teacher._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("infoSessions"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    timezone: v.string(),
    meetingUrl: v.optional(v.string()),
    published: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const session = await ctx.db.get(args.id);
    if (!session) throw new Error("Info session not found");
    if (!Number.isFinite(args.startsAt) || args.startsAt <= Date.now()) {
      throw new Error("Info session must be scheduled in the future");
    }

    await ctx.db.patch(args.id, {
      title: cleanText(args.title, "Title", 120),
      description: cleanOptionalText(args.description, "Description", 1000),
      startsAt: args.startsAt,
      timezone: validateTimezone(args.timezone),
      meetingUrl: cleanMeetingUrl(args.meetingUrl),
      published: args.published,
      updatedAt: Date.now(),
    });

    if (session.startsAt !== args.startsAt) {
      const reminderAt = args.startsAt - 30 * 60 * 1000;
      const currentTime = Date.now();
      const registrations = await ctx.db
        .query("infoSessionRegistrations")
        .withIndex("by_session", (q) => q.eq("sessionId", args.id))
        .take(500);
      for (const registration of registrations) {
        if (registration.status !== "active") continue;
        if (reminderAt > currentTime) {
          await ctx.scheduler.runAt(
            reminderAt,
            internal.email.sendInfoSessionReminder,
            {
              registrationId: registration._id,
              expectedStartsAt: args.startsAt,
            },
          );
        } else {
          await ctx.scheduler.runAfter(
            0,
            internal.email.sendInfoSessionReminder,
            {
              registrationId: registration._id,
              expectedStartsAt: args.startsAt,
            },
          );
        }
        await ctx.db.patch(registration._id, {
          reminderScheduledAt:
            reminderAt > currentTime ? reminderAt : currentTime,
          reminderSentAt: undefined,
        });
      }
    }
    return null;
  },
});

export const register = mutation({
  args: {
    sessionId: v.id("infoSessions"),
    name: v.string(),
    email: v.string(),
    consentToReminders: v.boolean(),
  },
  returns: v.object({
    registrationId: v.id("infoSessionRegistrations"),
    alreadyRegistered: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!args.consentToReminders) {
      throw new Error("Consent is required to send session emails");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.published) {
      throw new Error("This info session is not available");
    }
    const now = Date.now();
    if (session.startsAt <= now) {
      throw new Error("This info session has already started");
    }

    const normalizedEmail = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("infoSessionRegistrations")
      .withIndex("by_session_email", (q) =>
        q.eq("sessionId", args.sessionId).eq("normalizedEmail", normalizedEmail),
      )
      .unique();
    if (existing?.status === "active") {
      return {
        registrationId: existing._id,
        alreadyRegistered: true,
      };
    }

    const reminderAt = session.startsAt - 30 * 60 * 1000;
    const registrationId = existing
      ? existing._id
      : await ctx.db.insert("infoSessionRegistrations", {
          sessionId: args.sessionId,
          name: cleanText(args.name, "Name", 100),
          email: normalizedEmail,
          normalizedEmail,
          status: "active",
          consentedAt: now,
          registeredAt: now,
          reminderScheduledAt: reminderAt > now ? reminderAt : undefined,
        });

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: cleanText(args.name, "Name", 100),
        email: normalizedEmail,
        status: "active",
        consentedAt: now,
        registeredAt: now,
        reminderScheduledAt: reminderAt > now ? reminderAt : undefined,
        confirmationSentAt: undefined,
        reminderSentAt: undefined,
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.email.sendInfoSessionConfirmation,
      { registrationId },
    );
    if (reminderAt > now) {
      await ctx.scheduler.runAt(
        reminderAt,
        internal.email.sendInfoSessionReminder,
        { registrationId, expectedStartsAt: session.startsAt },
      );
    }

    return { registrationId, alreadyRegistered: false };
  },
});

export const getRegistrationEmailData = internalQuery({
  args: { registrationId: v.id("infoSessionRegistrations") },
  returns: v.union(reminderDataValidator, v.null()),
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return null;
    const session = await ctx.db.get(registration.sessionId);
    if (!session) return null;
    return {
      registrationId: registration._id,
      name: registration.name,
      email: registration.email,
      status: registration.status,
      confirmationSentAt: registration.confirmationSentAt,
      reminderSentAt: registration.reminderSentAt,
      sessionId: session._id,
      title: session.title,
      description: session.description,
      startsAt: session.startsAt,
      timezone: session.timezone,
      meetingUrl: session.meetingUrl,
      published: session.published,
    };
  },
});

export const markConfirmationSent = internalMutation({
  args: { registrationId: v.id("infoSessionRegistrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.registrationId, {
      confirmationSentAt: Date.now(),
    });
    return null;
  },
});

export const markReminderSent = internalMutation({
  args: { registrationId: v.id("infoSessionRegistrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.registrationId, {
      reminderSentAt: Date.now(),
    });
    return null;
  },
});
