import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { admin } from "../supabase/server";
export function tokenFor(nonce: string) {
  return (
    nonce +
    "." +
    createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
      .update("unsubscribe:" + nonce)
      .digest("base64url")
  );
}
export function validToken(token: string) {
  if (!/^[0-9a-f-]{36}\.[\w-]{43}$/.test(token)) return false;
  return timingSafeEqual(
    Buffer.from(token),
    Buffer.from(tokenFor(token.split(".")[0])),
  );
}
export function template(names: string[], link: string, test: boolean) {
  return [
    test
      ? "Your Dayleaf test email is here."
      : "Here’s what’s on your list today:",
    ...names.map((n) => "• " + n),
    "",
    "Open your journal: " + process.env.APP_URL,
    "",
    "Unsubscribe from habit reminders: " + link,
  ].join("\n");
}
export async function sendEmail(
  userId: string,
  to: string,
  names: string[],
  test = false,
  key?: string,
) {
  const { data, error } = await admin()
    .from("profiles")
    .select("unsubscribe_token")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const url = new URL("/api/unsubscribe", process.env.APP_URL);
  url.searchParams.set("token", tokenFor(data.unsubscribe_token));
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from: process.env.EMAIL_FROM!,
      to,
      subject: test ? "Dayleaf · Test email" : "Your habits for today",
      text: template(names, url.href, test),
      headers: {
        "List-Unsubscribe": "<" + url.href + ">",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    key ? { idempotencyKey: key } : undefined,
  );
  if (result.error) throw new Error("Email provider rejected the request.");
}
