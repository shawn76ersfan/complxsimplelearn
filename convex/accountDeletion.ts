import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { purgeUser } from "./lib/purgeUser";

/**
 * Called by the Clerk `user.deleted` webhook (see convex/http.ts). When a
 * person deletes their account in Clerk, wipe every trace of them here so
 * staff never see the account again.
 */
export const purgeByClerkId = internalMutation({
  args: { clerkId: v.string() },
  returns: v.union(v.literal("purged"), v.literal("not_found")),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return "not_found";
    await purgeUser(ctx, user);
    console.log("Purged deleted account", { clerkId: args.clerkId, role: user.role });
    return "purged";
  },
});
