"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { normalizeEmail } from "./lib/teacherEmails";

function appBaseUrl(): string {
  const url =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL;
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

function clerkSecret(): string {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CLERK_SECRET_KEY is not set on Convex. Run: npx convex env set CLERK_SECRET_KEY sk_...",
    );
  }
  return secret;
}

async function listPendingClerkInvitations(
  email: string,
): Promise<Array<{ id: string; email_address: string }>> {
  const response = await fetch(
    "https://api.clerk.com/v1/invitations?status=pending&limit=100",
    {
      headers: {
        Authorization: `Bearer ${clerkSecret()}`,
      },
    },
  );
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Could not list Clerk invitations: ${bodyText}`);
  }
  const data = JSON.parse(bodyText) as
    | Array<{ id: string; email_address: string }>
    | { data?: Array<{ id: string; email_address: string }> };
  const list = Array.isArray(data) ? data : (data.data ?? []);
  const normalized = normalizeEmail(email);
  return list.filter((inv) => normalizeEmail(inv.email_address) === normalized);
}

async function revokeClerkInvitation(invitationId: string): Promise<void> {
  const response = await fetch(
    `https://api.clerk.com/v1/invitations/${invitationId}/revoke`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecret()}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (response.ok || response.status === 404) return;
  const bodyText = await response.text();
  // Already revoked / not pending is fine for our flow
  const lowered = bodyText.toLowerCase();
  if (lowered.includes("already") || lowered.includes("revoked") || lowered.includes("not found")) {
    return;
  }
  throw new Error(`Could not revoke Clerk invitation: ${bodyText}`);
}

async function revokePendingClerkInvitationsForEmail(email: string): Promise<void> {
  const pending = await listPendingClerkInvitations(email);
  for (const inv of pending) {
    await revokeClerkInvitation(inv.id);
  }
}

async function createClerkInvitation(email: string): Promise<string | undefined> {
  const redirectUrl = `${appBaseUrl()}/sign-up`;

  async function postInvite(): Promise<{ ok: boolean; bodyText: string; id?: string }> {
    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: redirectUrl,
        notify: true,
      }),
    });
    const bodyText = await response.text();
    if (response.ok) {
      const data = JSON.parse(bodyText) as { id?: string };
      return { ok: true, bodyText, id: data.id };
    }
    return { ok: false, bodyText };
  }

  let result = await postInvite();
  if (result.ok) return result.id;

  const lowered = result.bodyText.toLowerCase();
  const isDuplicate =
    lowered.includes("duplicate") ||
    lowered.includes("already") ||
    lowered.includes("pending");

  if (isDuplicate) {
    // Clear stale Clerk invites (e.g. after we only revoked in Convex), then retry once.
    await revokePendingClerkInvitationsForEmail(email);
    result = await postInvite();
    if (result.ok) return result.id;
  }

  throw new Error(`Could not send Clerk invitation: ${result.bodyText}`);
}

export const inviteStudent = action({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.literal(true),
    email: v.string(),
    enrollmentId: v.id("enrollments"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: true; email: string; enrollmentId: Id<"enrollments"> }> => {
    const profile = (await ctx.runQuery(api.users.getMyProfile)) as {
      _id: Id<"users">;
      role: "teacher" | "student";
    } | null;
    if (!profile) throw new Error("Not authenticated");
    if (profile.role !== "teacher") throw new Error("Teacher access required");

    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Enter a valid email address.");

    const clerkInvitationId = await createClerkInvitation(email);

    const enrollmentId: Id<"enrollments"> = await ctx.runMutation(
      internal.enrollments.upsertInviteRecord,
      {
        email,
        displayName: args.displayName?.trim() || undefined,
        invitedBy: profile._id,
        clerkInvitationId,
      },
    );

    return { success: true as const, email, enrollmentId };
  },
});

export const resendInvite = action({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.object({ success: v.literal(true), email: v.string() }),
  handler: async (ctx, args) => {
    const profile = (await ctx.runQuery(api.users.getMyProfile)) as {
      role: "teacher" | "student";
    } | null;
    if (!profile) throw new Error("Not authenticated");
    if (profile.role !== "teacher") throw new Error("Teacher access required");

    const enrollment = (await ctx.runQuery(api.enrollments.getById, {
      enrollmentId: args.enrollmentId,
    })) as { email: string; status: string; clerkInvitationId?: string } | null;
    if (!enrollment) throw new Error("Invitation not found");
    if (enrollment.status !== "invited") {
      throw new Error("Only pending invitations can be resent.");
    }

    // Replace existing Clerk invite so the student gets a fresh email + ticket.
    if (enrollment.clerkInvitationId) {
      await revokeClerkInvitation(enrollment.clerkInvitationId);
    }
    await revokePendingClerkInvitationsForEmail(enrollment.email);
    await createClerkInvitation(enrollment.email);
    return { success: true as const, email: enrollment.email };
  },
});

export const revokeInvite = action({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = (await ctx.runQuery(api.users.getMyProfile)) as {
      role: "teacher" | "student";
    } | null;
    if (!profile) throw new Error("Not authenticated");
    if (profile.role !== "teacher") throw new Error("Teacher access required");

    const enrollment = (await ctx.runQuery(api.enrollments.getById, {
      enrollmentId: args.enrollmentId,
    })) as { email: string; status: string; clerkInvitationId?: string } | null;
    if (!enrollment) throw new Error("Invitation not found");
    if (enrollment.status !== "invited") {
      throw new Error("Only pending invitations can be revoked.");
    }

    if (enrollment.clerkInvitationId) {
      await revokeClerkInvitation(enrollment.clerkInvitationId);
    }
    await revokePendingClerkInvitationsForEmail(enrollment.email);
    await ctx.runMutation(internal.enrollments.markEnrollmentRevoked, {
      enrollmentId: args.enrollmentId,
    });
    return null;
  },
});
