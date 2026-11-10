import "server-only";
import { admin } from "./supabase/server";
import { Habit, Period } from "./schedule";
import type { Preferences } from "./reminders/select";
export type Profile = Preferences & {
  user_id: string;
  phone_e164: string | null;
  phone_verified_at: string | null;
  sms_consent_at: string | null;
  sms_notice: string | null;
  timezone_initialized: boolean;
};
const safeFields =
  "user_id,timezone,reminder_time,email_enabled,sms_enabled,last_email_sent_on,last_sms_sent_on,phone_e164,phone_verified_at,sms_consent_at,sms_notice,timezone_initialized";
export async function profile(id: string): Promise<Profile> {
  const { data, error } = await admin()
    .from("profiles")
    .select(safeFields)
    .eq("user_id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function habits(id: string): Promise<Habit[]> {
  const read = (table: string, order: string) => readOwned(id, table, order);

  const [records, periods, checks] = await Promise.all([
    read("habits", "id"),
    read("habit_periods", "effective_on"),
    read("check_ins", "id"),
  ]);
  return records
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((h) => ({
      id: h.id,
      name: h.name,
      schedule: h.schedule,
      archived: h.archived,
      created_at: h.created_at,
      periods: periods.filter((p) => p.habit_id === h.id) as Period[],
      checks: Object.fromEntries(
        checks.filter((c) => c.habit_id === h.id).map((c) => [c.date, c.note]),
      ),
    }));
}
export async function readOwned(id: string, table: string, order: string) {
  const db = admin(),
    rows = [];
  for (let start = 0; ; start += 500) {
    let q = db.from(table).select("*").eq("user_id", id).order(order);
    if (table === "habit_periods") q = q.order("habit_id");
    if (table === "reminder_deliveries") q = q.order("channel");
    const { data, error } = await q.range(start, start + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function limit(
  id: string,
  action: string,
  max: number,
  seconds: number,
) {
  const { data, error } = await admin().rpc("take_attempt", {
    owner_id: id,
    action_name: action,
    maximum: max,
    seconds,
  });
  if (error) throw error;
  if (!data) throw new Error("Please wait a little before trying again.");
}
export function checked(result: { error: unknown }) {
  if (result.error)
    throw new Error("That change could not be saved. Please try again.");
}
