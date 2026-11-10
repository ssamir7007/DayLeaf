import { account, admin } from "@/lib/supabase/server";
import { checked, profile, habits, limit, readOwned } from "@/lib/data";
import { localDay, shift, validDay } from "@/lib/dates";
import { isDueOnDate } from "@/lib/schedule";
import { normalizePhone } from "@/lib/sms/phone";
import {
  verification,
  checkCode,
  bindPhone,
  sendSms,
  smsFailure,
} from "@/lib/sms/server";
import { sendEmail } from "@/lib/email/send";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: Request) {
  try {
    const { user } = await account();
    const snapshot = {
      email: user.email,
      profile: await profile(user.id),
      habits: await habits(user.id),
    };
    if (new URL(req.url).searchParams.has("view"))
      return NextResponse.json(snapshot, {
        headers: { "Cache-Control": "no-store" },
      });
    const [check_ins, rate_limits, reminder_deliveries] = await Promise.all([
      readOwned(user.id, "check_ins", "id"),
      readOwned(user.id, "rate_limits", "action"),
      readOwned(user.id, "reminder_deliveries", "day"),
    ]);
    return NextResponse.json(
      {
        ...snapshot,
        account: { id: user.id, created_at: user.created_at },
        check_ins,
        rate_limits,
        reminder_deliveries,
      },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="dayleaf-export.json"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Export unavailable." }, { status: 403 });
  }
}
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== new URL(process.env.APP_URL!).origin)
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const { user, db } = await account(),
      id = user.id,
      service = admin(),
      b = await req.json(),
      p = await profile(id);
    const today = localDay(p.timezone);
    const update = (fields: Record<string, unknown>) =>
      service.from("profiles").update(fields).eq("user_id", id);
    switch (b.action) {
      case "habit": {
        if (
          typeof b.name !== "string" ||
          !b.name.trim() ||
          b.name.trim().length > 100
        )
          throw new Error("Enter a habit name of 1–100 characters.");
        const fields = { name: b.name.trim(), schedule: b.schedule };
        checked(
          await (b.id
            ? db.from("habits").update(fields).eq("id", b.id).eq("user_id", id)
            : db.from("habits").insert({ ...fields, user_id: id })),
        );
        break;
      }
      case "archive":
        checked(
          await db
            .from("habits")
            .update({ archived: b.archived === true })
            .eq("user_id", id)
            .eq("id", b.id),
        );
        break;
      case "check": {
        const h = (await habits(id)).find((h) => h.id === b.id);
        if (
          !h ||
          !validDay(b.day) ||
          b.day > today ||
          (!isDueOnDate(h, b.day) && !(b.day in h.checks))
        )
          throw new Error("Choose an available day for this habit.");
        if (typeof b.note !== "string" || b.note.length > 280)
          throw new Error("Keep the note under 281 characters.");
        checked(
          await (b.done
            ? db
                .from("check_ins")
                .upsert(
                  { habit_id: h.id, user_id: id, date: b.day, note: b.note },
                  { onConflict: "habit_id,date" },
                )
            : db
                .from("check_ins")
                .delete()
                .eq("user_id", id)
                .eq("habit_id", h.id)
                .eq("date", b.day)),
        );
        break;
      }
      case "timezone":
        new Intl.DateTimeFormat("en", { timeZone: b.zone });
        checked(
          await update({ timezone: b.zone, timezone_initialized: true }).eq(
            "timezone_initialized",
            false,
          ),
        );
        break;
      case "preferences": {
        new Intl.DateTimeFormat("en", { timeZone: b.zone });
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time))
          throw new Error("Choose a valid reminder time.");
        checked(
          await update({
            timezone: b.zone,
            timezone_initialized: true,
            reminder_time: b.time,
            email_enabled: b.email === true,
          }),
        );
        break;
      }
      case "verify-send": {
        await limit(id, "code-request", 3, 900);
        const number = normalizePhone(b.phone);
        await verification(number);
        checked(
          await update({
            phone_e164: number,
            phone_verified_at: null,
            sms_consent_at: null,
            phone_binding: null,
            sms_enabled: false,
            sms_notice: null,
          }),
        );
        break;
      }
      case "verify-check": {
        await limit(id, "code-attempt", 5, 900);
        if (
          !p.phone_e164 ||
          !/^\d{4,10}$/.test(b.code) ||
          !(await checkCode(p.phone_e164, b.code))
        )
          throw new Error(
            "That code was not accepted. Check the code and try again.",
          );
        checked(
          await update({ phone_verified_at: new Date().toISOString() }).eq(
            "phone_e164",
            p.phone_e164,
          ),
        );
        break;
      }
      case "sms-enable": {
        if (b.consent !== true || !p.phone_verified_at || !p.phone_e164)
          throw new Error(
            "Verify your number and agree to reminder texts first.",
          );
        checked(
          await update({
            sms_enabled: true,
            sms_consent_at: new Date().toISOString(),
            phone_binding: bindPhone(p.phone_e164),
            sms_notice: null,
          })
            .eq("phone_e164", p.phone_e164)
            .not("phone_verified_at", "is", null)
            .select("user_id")
            .single(),
        );
        break;
      }
      case "sms-disable":
        checked(
          await update({
            sms_enabled: false,
            phone_e164: null,
            phone_binding: null,
            phone_verified_at: null,
            sms_consent_at: null,
            sms_notice: null,
          }),
        );
        break;
      case "test-email":
        await limit(id, "test-email", 3, 3600);
        await sendEmail(id, user.email!, [], true);
        break;
      case "test-sms": {
        if (!p.sms_enabled || !p.phone_e164)
          throw new Error("Enable SMS reminders first.");
        await limit(id, "test-sms", 3, 3600);
        try {
          await sendSms(
            p.phone_e164,
            "Your Dayleaf test text is here. Reply STOP to opt out",
          );
        } catch (e) {
          await smsFailure(id, p.phone_e164, e);
          throw new Error("Text delivery failed. Check your SMS settings.");
        }
        break;
      }
      case "sample":
        checked(await service.rpc("load_sample", { owner_id: id }));
        break;
      case "delete":
        if (b.confirm !== "DELETE") throw new Error("Type DELETE to confirm.");
        checked(await service.auth.admin.deleteUser(id));
        await db.auth.signOut();
        break;
      default:
        throw new Error("Unknown action.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    const safe =
      /^(Please |That |Enter |Choose |Keep |Verify |Enable |Text delivery|Type DELETE)/.test(
        m,
      );
    return NextResponse.json(
      {
        error: safe ? m : "We couldn’t finish that request. Please try again.",
      },
      { status: 400 },
    );
  }
}
