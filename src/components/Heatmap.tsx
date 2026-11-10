import { useState } from "react";
import { Habit, isDueOnDate } from "@/lib/schedule";
import { formatDay, monday, shift } from "@/lib/dates";
import { DayDetail } from "./DayDetail";
export function Heatmap({
  h,
  today,
  busy,
  check,
}: {
  h: Habit;
  today: string;
  busy: boolean;
  check: (day: string, done: boolean, note: string) => void;
}) {
  const [selected, setSelected] = useState(""),
    first = shift(monday(today), -77);
  return (
    <section>
      <h3>Last 12 weeks</h3>
      <div className="heat-scroll">
        <div className="heat-dates">
          <span>{formatDay(first, { month: "short", day: "numeric" })}</span>
          <span>{formatDay(today, { month: "short", day: "numeric" })}</span>
        </div>
        <div className="heat">
          {Array.from({ length: 84 }, (_, i) => {
            const d = shift(first, i),
              state =
                d > today
                  ? "future"
                  : d in h.checks
                    ? "done"
                    : isDueOnDate(h, d)
                      ? "missed"
                      : "not-due";
            return (
              <button
                key={d}
                className={state}
                disabled={state === "future" || state === "not-due"}
                aria-label={d + " " + state.replace("-", " ")}
                aria-pressed={selected === d}
                title={d + " " + state}
                onClick={() => setSelected(d)}
              >
                {Number(d.slice(-2))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="legend">
        {["done", "missed", "not-due", "future"].map((s) => (
          <span key={s}>
            <i className={s} />
            {s.replace("-", " ")}
          </span>
        ))}
      </div>
      {selected && (
        <DayDetail
          key={selected + String(h.checks[selected])}
          day={selected}
          note={h.checks[selected]}
          busy={busy}
          onSave={(done, note) => check(selected, done, note)}
        />
      )}
    </section>
  );
}
