import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Verify a Clerk (Svix) webhook signature without extra dependencies.
 * https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
async function verifyClerkSignature(
  request: Request,
  body: string,
  secret: string,
): Promise<boolean> {
  const msgId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature");
  if (!msgId || !timestamp || !signatures) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(rawSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${msgId}.${timestamp}.${body}`),
  );
  const expected = bytesToBase64(signed);

  return signatures
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .some((sig) => sig !== undefined && sig === expected);
}

http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("CLERK_WEBHOOK_SECRET is not set; refusing webhook");
      return new Response("Webhook not configured", { status: 500 });
    }

    const body = await request.text();
    if (!(await verifyClerkSignature(request, body, secret))) {
      return new Response("Invalid signature", { status: 400 });
    }

    let event: { type?: string; data?: { id?: string } };
    try {
      event = JSON.parse(body) as { type?: string; data?: { id?: string } };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.type === "user.deleted" && typeof event.data?.id === "string") {
      const result = await ctx.runMutation(internal.accountDeletion.purgeByClerkId, {
        clerkId: event.data.id,
      });
      return new Response(result, { status: 200 });
    }

    // Other Clerk events are not handled here; acknowledge so Clerk stops retrying.
    return new Response("ignored", { status: 200 });
  }),
});

export default http;
