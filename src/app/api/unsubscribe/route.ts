import { validToken } from "@/lib/email/send";
import { admin } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!validToken(token))
    return new Response("Invalid unsubscribe link.", { status: 400 });
  const { data, error } = await admin()
    .from("profiles")
    .update({ email_enabled: false })
    .eq("unsubscribe_token", token.split(".")[0])
    .select("user_id")
    .maybeSingle();
  return new Response(
    error
      ? "Please try again."
      : data
        ? "Email reminders are off. You can turn them on again in Dayleaf Settings."
        : "Invalid unsubscribe link.",
    {
      status: error ? 500 : data ? 200 : 400,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
export const POST = GET;
