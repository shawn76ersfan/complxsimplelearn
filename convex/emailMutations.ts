import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertLog = internalMutation({
  args: {
    subject: v.string(),
    body: v.string(),
    recipientIds: v.array(v.id("users")),
    recipientCount: v.number(),
    sentBy: v.id("users"),
    cohortId: v.optional(v.id("cohorts")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", {
      subject: args.subject,
      body: args.body,
      recipientIds: args.recipientIds,
      recipientCount: args.recipientCount,
      sentBy: args.sentBy,
      sentAt: Date.now(),
      cohortId: args.cohortId,
    });
  },
});
