import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "info_session_registration";

type TurnstileVerification = {
  success: boolean;
  action?: string;
};

function isTurnstileVerification(
  value: unknown,
): value is TurnstileVerification {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean" &&
    (!("action" in value) ||
      value.action === undefined ||
      typeof value.action === "string")
  );
}

async function verifyTurnstile(token: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Info-session registration is temporarily unavailable. TURNSTILE_SECRET_KEY is not configured.",
    );
  }
  const cleanedToken = token.trim();
  if (!cleanedToken || cleanedToken.length > 2048) {
    throw new Error("Complete the security check before registering.");
  }

  const body = new URLSearchParams({
    secret,
    response: cleanedToken,
  });
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("The security check could not be verified. Please retry.");
  }

  const result: unknown = await response.json();
  if (
    !isTurnstileVerification(result) ||
    !result.success ||
    (result.action !== undefined && result.action !== TURNSTILE_ACTION)
  ) {
    throw new Error("The security check expired or failed. Please retry.");
  }
}

// Public by design: prospective students do not need a Clerk account.
// The database write is internal and can only run after Turnstile succeeds.
export const register = action({
  args: {
    sessionId: v.id("infoSessions"),
    name: v.string(),
    email: v.string(),
    consentToReminders: v.boolean(),
    turnstileToken: v.string(),
    website: v.optional(v.string()),
  },
  returns: v.object({
    registrationId: v.id("infoSessionRegistrations"),
    alreadyRegistered: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    registrationId: Id<"infoSessionRegistrations">;
    alreadyRegistered: boolean;
  }> => {
    if (args.website?.trim()) {
      throw new Error("Unable to register. Please refresh and try again.");
    }
    await verifyTurnstile(args.turnstileToken);
    return await ctx.runMutation(internal.infoSessions.registerVerified, {
      sessionId: args.sessionId,
      name: args.name,
      email: args.email,
      consentToReminders: args.consentToReminders,
    });
  },
});
