import { timingSafeEqual, createHash } from "node:crypto";
import { admin } from "@/lib/supabase/server";
import { habits, profile, checked } from "@/lib/data";
import { select } from "@/lib/reminders/select";
import { message } from "@/lib/sms/phone";
import { sendSms, smsFailure } from "@/lib/sms/server";
import { sendEmail } from "@/lib/email/send";
export const maxDuration = 60;
const digest = (s: string) => createHash("sha256").update(s).digest();
export async function POST(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    !timingSafeEqual(
      digest(req.headers.get("authorization") || ""),
      digest("Bearer " + process.env.CRON_SECRET),
    )
  )
    return new Response("Unauthorized", { status: 401 });
  const db = admin(),
    at = new Date(),
    counts = { sent: 0, errors: 0 };
  // Cursor pages allow the workflow to resume within the function time limit.
  const cursor = new URL(req.url).searchParams.get("after");
  if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor))
    return new Response("Invalid cursor", { status: 400 });
  let query = db
    .from("profiles")
    .select("user_id")
    .or("email_enabled.eq.true,sms_enabled.eq.true")
    .order("user_id")
    .limit(5);
  if (cursor) query = query.gt("user_id", cursor);
  const { data, error } = await query;
  if (error) return new Response("Batch unavailable", { status: 503 });
  await Promise.all(
    data.map(async ({ user_id: id }) => {
      try {
        const hs = await habits(id);
        await Promise.all(
          (["email", "sms"] as const).map(async (channel) => {
            try {
              const p = await profile(id),
                due = select(p, hs, at);
              if (!due[channel]) return;
              const key = { user_id: id, day: due.day, channel };
              // Reserve before external I/O: an ambiguous provider timeout cannot cause
              // a second message in a later invocation.
              const claim = await db.from("reminder_deliveries").insert(key);
              if (claim.error?.code === "23505") return;
              if (claim.error) throw claim.error;
              if (channel === "email") {
                const { data, error } = await db.auth.admin.getUserById(id);
                if (error || !data.user?.email)
                  throw new Error("Email unavailable");
                await sendEmail(
                  id,
                  data.user.email,
                  due.pending,
                  false,
                  id + "-" + due.day,
                );
              } else if (p.phone_e164) {
                try {
                  await sendSms(p.phone_e164, message(due.pending));
                } catch (e) {
                  await smsFailure(id, p.phone_e164, e);
                  throw e;
                }
              } else return;
              checked(
                await db
                  .from("profiles")
                  .update({ ["last_" + channel + "_sent_on"]: due.day })
                  .eq("user_id", id),
              );
              counts.sent++;
            } catch {
              counts.errors++;
              console.error("Reminder channel failed", channel);
            }
          }),
        );
      } catch {
        counts.errors++;
        console.error("Reminder profile failed");
      }
    }),
  );
  return Response.json({
    ...counts,
    next: data.length === 5 ? data[4].user_id : null,
  });
}
