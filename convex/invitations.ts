"use node";

import { action, ActionCtx } from "./_generated/server";
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

async function createClerkInvitation(
  email: string,
): Promise<{ alreadyRegistered: boolean; clerkInvitationId?: string }> {
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
  if (result.ok) return { alreadyRegistered: false, clerkInvitationId: result.id };
  if (isClerkIdentifierTaken(result.bodyText)) return { alreadyRegistered: true };

  const lowered = result.bodyText.toLowerCase();
  const isDuplicate =
    lowered.includes("duplicate") ||
    lowered.includes("already") ||
    lowered.includes("pending");

  if (isDuplicate) {
    // Clear stale Clerk invites (e.g. after we only revoked in Convex), then retry once.
    await revokePendingClerkInvitationsForEmail(email);
    result = await postInvite();
    if (result.ok) return { alreadyRegistered: false, clerkInvitationId: result.id };
    if (isClerkIdentifierTaken(result.bodyText)) return { alreadyRegistered: true };
  }

  throw new Error(`Could not send Clerk invitation: ${result.bodyText}`);
}

function isClerkIdentifierTaken(bodyText: string): boolean {
  const lowered = bodyText.toLowerCase();
  return (
    lowered.includes("form_identifier_exists") ||
    lowered.includes("email address is taken") ||
    lowered.includes("identifier_exists")
  );
}

async function findClerkUserByEmail(email: string): Promise<{
  clerkId: string;
  name: string;
  imageUrl?: string;
} | null> {
  const response = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecret()}`,
      },
    },
  );
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Could not look up Clerk user: ${bodyText}`);
  }
  const data = JSON.parse(bodyText) as
    | Array<{
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
      }>
    | {
        data?: Array<{
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          image_url?: string | null;
        }>;
      };
  const list = Array.isArray(data) ? data : (data.data ?? []);
  const user = list[0];
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return {
    clerkId: user.id,
    name: name || "Student",
    imageUrl: user.image_url ?? undefined,
  };
}

type Role = "admin" | "teacher" | "student";

async function requireStaffProfile(ctx: ActionCtx): Promise<{ _id: Id<"users">; role: Role }> {
  const profile = (await ctx.runQuery(api.users.getMyProfile)) as {
    _id: Id<"users">;
    role: Role;
  } | null;
  if (!profile) throw new Error("Not authenticated");
  if (profile.role !== "admin" && profile.role !== "teacher") {
    throw new Error("Instructor access required");
  }
  return profile;
}

/**
 * Invite a student (or, for admins, a new teacher). Teachers must invite into
 * one of their own cohorts; admins may invite school-wide.
 */
export const inviteStudent = action({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
    cohortId: v.optional(v.id("cohorts")),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"))),
  },
  returns: v.object({
    success: v.literal(true),
    email: v.string(),
    enrollmentId: v.id("enrollments"),
    alreadyHadAccount: v.boolean(),
    alreadyInCohort: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: true;
    email: string;
    enrollmentId: Id<"enrollments">;
    alreadyHadAccount: boolean;
    alreadyInCohort: boolean;
  }> => {
    const profile = await requireStaffProfile(ctx);
    const role = args.role ?? "student";

    const allowed: boolean = await ctx.runQuery(api.cohorts.canInviteTo, {
      cohortId: args.cohortId,
      role,
    });
    if (!allowed) {
      throw new Error(
        role === "teacher"
          ? "Only admins can invite instructors."
          : args.cohortId
            ? "You can only invite students into cohorts you teach."
            : "Pick a cohort to invite this student into.",
      );
    }

    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Enter a valid email address.");

    const enrolled = await enrollExistingMember(ctx, {
      email,
      displayName: args.displayName?.trim() || undefined,
      invitedBy: profile._id,
      cohortId: args.cohortId,
      role,
    });
    if (enrolled) {
      return {
        success: true as const,
        email,
        enrollmentId: enrolled.enrollmentId,
        alreadyHadAccount: true,
        alreadyInCohort: enrolled.alreadyInCohort,
      };
    }

    const invite = await createClerkInvitation(email);
    if (invite.alreadyRegistered) {
      const again = await enrollExistingMember(ctx, {
        email,
        displayName: args.displayName?.trim() || undefined,
        invitedBy: profile._id,
        cohortId: args.cohortId,
        role,
      });
      if (again) {
        return {
          success: true as const,
          email,
          enrollmentId: again.enrollmentId,
          alreadyHadAccount: true,
          alreadyInCohort: again.alreadyInCohort,
        };
      }
      throw new Error(
        role === "teacher"
          ? "This email already has an account. Assign them to a cohort from the Instructors list."
          : "This email already has an account, but we could not add them to the cohort. Try again or add them from the cohort roster.",
      );
    }

    const enrollmentId: Id<"enrollments"> = await ctx.runMutation(
      internal.enrollments.upsertInviteRecord,
      {
        email,
        displayName: args.displayName?.trim() || undefined,
        invitedBy: profile._id,
        clerkInvitationId: invite.clerkInvitationId,
        cohortId: args.cohortId,
        role,
      },
    );

    return {
      success: true as const,
      email,
      enrollmentId,
      alreadyHadAccount: false,
      alreadyInCohort: false,
    };
  },
});

async function enrollExistingMember(
  ctx: ActionCtx,
  args: {
    email: string;
    displayName?: string;
    invitedBy: Id<"users">;
    cohortId?: Id<"cohorts">;
    role: "student" | "teacher";
  },
): Promise<{ enrollmentId: Id<"enrollments">; alreadyInCohort: boolean } | null> {
  const existing = await ctx.runMutation(internal.enrollments.addExistingStudentByEmail, {
    email: args.email,
    displayName: args.displayName,
    invitedBy: args.invitedBy,
    cohortId: args.cohortId,
    role: args.role,
  });
  if (existing) return existing;

  const clerkUser = await findClerkUserByEmail(args.email);
  if (!clerkUser) return null;

  return await ctx.runMutation(internal.enrollments.addExistingStudentByEmail, {
    email: args.email,
    displayName: args.displayName,
    invitedBy: args.invitedBy,
    cohortId: args.cohortId,
    role: args.role,
    clerkUser,
  });
}

export const resendInvite = action({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.object({ success: v.literal(true), email: v.string() }),
  handler: async (ctx, args) => {
    await requireStaffProfile(ctx);

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
    const invite = await createClerkInvitation(enrollment.email);
    if (invite.alreadyRegistered) {
      throw new Error(
        "This student already has an account. Add them to the cohort instead of resending an invite.",
      );
    }
    return { success: true as const, email: enrollment.email };
  },
});

export const revokeInvite = action({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireStaffProfile(ctx);

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
