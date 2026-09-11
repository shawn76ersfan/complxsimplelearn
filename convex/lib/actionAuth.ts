import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

export async function requireActiveProfile(
  ctx: ActionCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const profile = await ctx.runQuery(api.users.getMyProfile, {});
  if (!profile) throw new Error("Not authenticated");
  if (profile.status === "dropped") throw new Error("Account is inactive");
  return profile;
}
