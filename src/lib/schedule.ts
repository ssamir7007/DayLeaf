import { monday, weekday } from "./dates";
export type Schedule =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] }
  | { type: "weekly"; target: number };
export type Period = {
  effective_on: string;
  schedule: Schedule;
  archived: boolean;
};
export type Habit = {
  id: string;
  name: string;
  schedule: Schedule;
  archived: boolean;
  created_at: string;
  periods: Period[];
  checks: Record<string, string>;
};
export function scheduleOn(h: Habit, day: string) {
  const p = h.periods.findLast((p) => p.effective_on <= day);
  return p && !p.archived ? p.schedule : null;
}
export function isDueOnDate(h: Habit, day: string) {
  const s = scheduleOn(h, day);
  if (!s) return false;
  if (s.type === "weekdays") return s.days.includes(weekday(day));
  if (s.type === "weekly")
    return (
      Object.keys(h.checks).filter((d) => d >= monday(day) && d < day).length <
      s.target
    );
  return true;
}
export function scheduleLabel(s: Schedule) {
  if (s.type === "daily") return "Every day";
  if (s.type === "weekly") return s.target + " times a week";
  return s.days
    .map((d) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1])
    .join(", ");
}
