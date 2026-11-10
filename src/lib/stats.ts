import { shift, monday } from "./dates";
import { Habit, isDueOnDate, scheduleOn } from "./schedule";
// A weekly quota contributes one streak unit. Partial windows are capped by
// the number of eligible dates and the quota remaining at the window start.
export function stats(h: Habit, today: string) {
  let current = 0,
    best = 0;
  const windows = [7, 30].map((n) => ({
    start: shift(today, 1 - n),
    done: 0,
    due: 0,
  }));
  const groups = new Map<string, { days: string[]; target: number }>();
  const units: { day: string; hit: boolean; open: boolean; weekly: boolean }[] =
    [];
  for (
    let d = h.periods[0]?.effective_on ?? today;
    d <= today;
    d = shift(d, 1)
  ) {
    const s = scheduleOn(h, d);
    if (s?.type === "weekly") {
      const key = monday(d);
      const group = groups.get(key) ?? { days: [], target: s.target };
      group.days.push(d);
      group.target = s.target;
      groups.set(key, group);
    } else if (isDueOnDate(h, d)) {
      const hit = d in h.checks;
      units.push({ day: d, hit, open: d === today, weekly: false });
      for (const w of windows)
        if (d >= w.start) {
          w.due++;
          if (hit) w.done++;
        }
    }
  }
  for (const [week, g] of groups) {
    const hits = g.days.filter((d) => d in h.checks);
    units.push({
      day: g.days[g.days.length - 1],
      hit: hits.length >= g.target,
      open: week === monday(today),
      weekly: true,
    });
    for (const w of windows) {
      const remaining = Math.max(
        0,
        g.target - hits.filter((d) => d < w.start).length,
      );
      const due = Math.min(
        g.days.filter((d) => d >= w.start).length,
        remaining,
      );
      w.due += due;
      w.done += Math.min(due, hits.filter((d) => d >= w.start).length);
    }
  }
  for (const u of units.sort((a, b) => a.day.localeCompare(b.day))) {
    if (u.weekly !== (h.schedule.type === "weekly")) {
      current = 0;
      continue;
    }
    if (u.hit) current++;
    else if (!u.open) current = 0;
    best = Math.max(best, current);
  }
  return { current, best, windows };
}
