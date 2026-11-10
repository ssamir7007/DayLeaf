import { localDay, localTime } from "../dates";
import { Habit, isDueOnDate } from "../schedule";
export type Preferences = {
  timezone: string;
  reminder_time: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  last_email_sent_on: string | null;
  last_sms_sent_on: string | null;
};
export function select(p: Preferences, habits: Habit[], at: Date) {
  const day = localDay(p.timezone, at);
  const pending = habits
    .filter((h) => isDueOnDate(h, day) && !(day in h.checks))
    .map((h) => h.name);
  const ready =
    pending.length > 0 &&
    localTime(p.timezone, at) >= p.reminder_time.slice(0, 5);
  return {
    day,
    pending,
    email: ready && p.email_enabled && p.last_email_sent_on !== day,
    sms: ready && p.sms_enabled && p.last_sms_sent_on !== day,
  };
}
