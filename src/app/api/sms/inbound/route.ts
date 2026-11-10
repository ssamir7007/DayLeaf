import { fields } from "@/lib/sms/webhook";
import { keyword } from "@/lib/sms/phone";
import { bindPhone } from "@/lib/sms/server";
import { admin } from "@/lib/supabase/server";
import { checked } from "@/lib/data";
import twilio from "twilio";
export async function POST(req: Request) {
  const p = await fields(req, "/api/sms/inbound");
  if (!p) return new Response("Invalid signature", { status: 403 });
  const command = keyword(p.OptOutType || p.Body || ""),
    db = admin(),
    xml = new twilio.twiml.MessagingResponse();
  if (command === "stop")
    checked(
      await db
        .from("profiles")
        .update({
          sms_enabled: false,
          phone_e164: null,
          phone_verified_at: null,
          sms_notice: "Text reminders are off after your STOP reply.",
        })
        .eq("phone_e164", p.From),
    );
  if (command === "start")
    checked(
      await db
        .from("profiles")
        .update({
          sms_enabled: true,
          phone_e164: p.From,
          phone_verified_at: new Date().toISOString(),
          sms_notice: null,
        })
        .eq("phone_binding", bindPhone(p.From))
        .not("sms_consent_at", "is", null),
    );
  if (command === "help" && !p.OptOutType)
    xml.message(
      "Dayleaf habit reminders. Manage texts in Settings at " +
        process.env.APP_URL +
        ". Reply STOP to opt out.",
    );
  return new Response(xml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
