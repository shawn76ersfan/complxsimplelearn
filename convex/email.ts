"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlBody(body: string): string {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED, #06B6D4); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ComplxSimple</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">A message from Cassandra Carter</p>
          </div>
          <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            ${escapeHtml(body).replace(/\n/g, "<br/>")}
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #6b7280; font-size: 13px; margin: 0;">Sent via ComplxSimple &mdash; Your interactive CS learning platform</p>
          </div>
        </div>
      `;
}

function formatSessionDate(startsAt: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(startsAt);
}

function buildInfoSessionBody(args: {
  heading: string;
  name: string;
  title: string;
  description?: string;
  startsAt: number;
  timezone: string;
  meetingUrl?: string;
}): string {
  const meetingLink = args.meetingUrl
    ? `<p style="margin-top: 24px;"><a href="${escapeHtml(args.meetingUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;">Join the info session</a></p>`
    : '<p style="margin-top: 24px;color:#6b7280;">Meeting details will be shared before the session.</p>';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#2563EB,#F97316);padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${escapeHtml(args.heading)}</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;">ComplxSimple</p>
      </div>
      <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;color:#111827;">
        <p>Hi ${escapeHtml(args.name)},</p>
        <h2 style="margin-bottom:8px;">${escapeHtml(args.title)}</h2>
        <p style="font-size:16px;font-weight:700;color:#2563EB;">${escapeHtml(formatSessionDate(args.startsAt, args.timezone))}</p>
        ${args.description ? `<p>${escapeHtml(args.description)}</p>` : ""}
        ${meetingLink}
        <p style="margin-top:24px;color:#6b7280;font-size:13px;">You received this transactional email because you registered for this ComplxSimple info session.</p>
      </div>
    </div>
  `;
}

function emailProvider(): "gmail" | "resend" {
  const configured = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (configured === "gmail") return "gmail";
  if (configured === "resend") return "resend";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  return "resend";
}

async function sendViaGmail(args: {
  subject: string;
  html: string;
  to: string[];
}): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Gmail is selected but GMAIL_USER or GMAIL_APP_PASSWORD is missing on this Convex deployment. Create a Google App Password and set both with npx convex env set."
    );
  }

  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: pass.replace(/\s/g, "") },
  });

  const fromName = process.env.EMAIL_FROM_NAME ?? "ComplxSimple";
  const info = await transport.sendMail({
    from: `"${fromName}" <${user}>`,
    to: args.to.length === 1 ? args.to[0] : user,
    bcc: args.to.length > 1 ? args.to.join(", ") : undefined,
    subject: args.subject,
    html: args.html,
  });

  if (!info.messageId) {
    throw new Error("Gmail SMTP did not return a message id.");
  }
}

async function sendViaResend(args: {
  subject: string;
  html: string;
  to: string[];
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set on this Convex deployment. Add it in the Convex dashboard or set EMAIL_PROVIDER=gmail with GMAIL_USER and GMAIL_APP_PASSWORD."
    );
  }

  const fromEmail = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail.includes("<") ? fromEmail : `ComplxSimple <${fromEmail}>`,
    to: args.to.length === 1 ? args.to : [fromEmail],
    bcc: args.to.length > 1 ? args.to : undefined,
    subject: args.subject,
    html: args.html,
  });

  if (error) {
    console.error("Resend send failed:", error);
    throw new Error(
      error.message ??
        "Resend rejected the email. For Gmail, set EMAIL_PROVIDER=gmail and Google App Password env vars on Convex."
    );
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message id. Check the Resend dashboard logs.");
  }
}

async function sendConfiguredEmail(args: {
  subject: string;
  html: string;
  to: string[];
}): Promise<"gmail" | "resend"> {
  const provider = emailProvider();
  if (provider === "gmail") {
    await sendViaGmail(args);
  } else {
    await sendViaResend(args);
  }
  return provider;
}

export const sendEmail = action({
  args: {
    subject: v.string(),
    body: v.string(),
    recipientIds: v.array(v.id("users")),
  },
  returns: v.object({ success: v.literal(true), sent: v.number() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const allStudents = (await ctx.runQuery(api.users.listStudents)) as Array<{
      _id: Id<"users">;
      email: string;
      name: string;
    }>;

    const recipients =
      args.recipientIds.length > 0
        ? allStudents.filter((s) => (args.recipientIds as string[]).includes(s._id as string))
        : allStudents;

    if (recipients.length === 0) throw new Error("No recipients found");

    const html = buildHtmlBody(args.body);
    const to = recipients.map((r) => r.email);
    await sendConfiguredEmail({ subject: args.subject, html, to });

    const sender = (await ctx.runQuery(api.users.getMyProfile)) as { _id: Id<"users"> } | null;
    if (!sender) throw new Error("Sender not found");

    await ctx.runMutation(internal.emailMutations.insertLog, {
      subject: args.subject,
      body: args.body,
      recipientIds: recipients.map((r) => r._id),
      recipientCount: recipients.length,
      sentBy: sender._id,
    });

    return { success: true as const, sent: recipients.length };
  },
});

export const sendTestEmail = action({
  args: {},
  returns: v.object({
    success: v.literal(true),
    email: v.string(),
    provider: v.union(v.literal("gmail"), v.literal("resend")),
  }),
  handler: async (ctx) => {
    const profile = (await ctx.runQuery(api.users.getMyProfile)) as {
      _id: Id<"users">;
      email: string;
      role: "teacher" | "student";
    } | null;
    if (!profile) throw new Error("Not authenticated");
    if (profile.role !== "teacher") throw new Error("Teacher access required");

    const subject = "ComplxSimple email test";
    const body =
      "Your ComplxSimple email setup is working.\n\nThis test was sent from the Teacher Hub.";
    const provider = await sendConfiguredEmail({
      subject,
      html: buildHtmlBody(body),
      to: [profile.email],
    });

    await ctx.runMutation(internal.emailMutations.insertLog, {
      subject,
      body,
      recipientIds: [profile._id],
      recipientCount: 1,
      sentBy: profile._id,
    });

    return { success: true as const, email: profile.email, provider };
  },
});

export const sendInfoSessionConfirmation = internalAction({
  args: { registrationId: v.id("infoSessionRegistrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.infoSessions.getRegistrationEmailData,
      { registrationId: args.registrationId },
    );
    if (
      !data ||
      data.status !== "active" ||
      !data.published ||
      data.confirmationSentAt !== undefined
    ) {
      return null;
    }

    await sendConfiguredEmail({
      to: [data.email],
      subject: `You're registered: ${data.title}`,
      html: buildInfoSessionBody({
        heading: "Registration confirmed",
        name: data.name,
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        timezone: data.timezone,
        meetingUrl: data.meetingUrl,
      }),
    });
    await ctx.runMutation(internal.infoSessions.markConfirmationSent, {
      registrationId: args.registrationId,
    });
    return null;
  },
});

export const sendInfoSessionReminder = internalAction({
  args: {
    registrationId: v.id("infoSessionRegistrations"),
    expectedStartsAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.infoSessions.getRegistrationEmailData,
      { registrationId: args.registrationId },
    );
    if (
      !data ||
      data.status !== "active" ||
      !data.published ||
      data.reminderSentAt !== undefined
    ) {
      return null;
    }

    const now = Date.now();
    if (data.startsAt !== args.expectedStartsAt) {
      const correctedReminderAt = data.startsAt - 30 * 60 * 1000;
      if (correctedReminderAt > now) {
        await ctx.scheduler.runAt(
          correctedReminderAt,
          internal.email.sendInfoSessionReminder,
          {
            registrationId: args.registrationId,
            expectedStartsAt: data.startsAt,
          },
        );
        return null;
      }
    }
    if (data.startsAt <= now) return null;

    await sendConfiguredEmail({
      to: [data.email],
      subject: `Starts in 30 minutes: ${data.title}`,
      html: buildInfoSessionBody({
        heading: "Your info session starts in 30 minutes",
        name: data.name,
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        timezone: data.timezone,
        meetingUrl: data.meetingUrl,
      }),
    });
    await ctx.runMutation(internal.infoSessions.markReminderSent, {
      registrationId: args.registrationId,
    });
    return null;
  },
});
