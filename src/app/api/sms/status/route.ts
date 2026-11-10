import { fields } from "@/lib/sms/webhook";
import { smsFailure } from "@/lib/sms/server";
import { admin } from "@/lib/supabase/server";
export async function POST(req: Request) {
  const p = await fields(req, "/api/sms/status");
  if (!p) return new Response("Invalid signature", { status: 403 });
  if (p.ErrorCode && p.To) {
    const { data, error } = await admin()
      .from("profiles")
      .select("user_id")
      .eq("phone_e164", p.To)
      .maybeSingle();
    if (error) return new Response(null, { status: 503 });
    if (data) await smsFailure(data.user_id, p.To, { code: p.ErrorCode });
  }
  return new Response(null, { status: 204 });
}
