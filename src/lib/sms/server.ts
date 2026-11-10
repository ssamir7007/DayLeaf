import "server-only";
import twilio from "twilio";
import { createHmac } from "node:crypto";
import { admin } from "../supabase/server";
import { checked } from "../data";
const client = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, {
    timeout: 10000,
  });
const verify = () =>
  client().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!);
export const verification = (to: string) =>
  verify().verifications.create({ to, channel: "sms" });
export async function checkCode(to: string, code: string) {
  return (
    (await verify().verificationChecks.create({ to, code })).status ===
    "approved"
  );
}
export const bindPhone = (number: string) =>
  createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update("verified-phone:" + number)
    .digest("hex");
export const sendSms = (to: string, body: string) =>
  client().messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER!,
    body,
    statusCallback: new URL("/api/sms/status", process.env.APP_URL).href,
  });
export async function smsFailure(id: string, number: string, e: unknown) {
  const code = Number((e as { code?: number })?.code);
  if (![21610, 21211, 21614, 30005, 30006].includes(code)) return;
  const opted = code === 21610;
  checked(
    await admin()
      .from("profiles")
      .update({
        sms_enabled: false,
        phone_e164: null,
        phone_verified_at: null,
        ...(!opted ? { phone_binding: null, sms_consent_at: null } : {}),
        sms_notice: opted
          ? "Text reminders were turned off after an opt-out."
          : "Your number could not receive texts. Verify a new number to resume.",
      })
      .eq("user_id", id)
      .eq("phone_e164", number),
  );
}
