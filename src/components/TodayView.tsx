import { Habit, isDueOnDate } from "@/lib/schedule";
import { formatDay } from "@/lib/dates";
import { HabitCard } from "./HabitCard";
export function TodayView({
  hs,
  day,
  busy,
  toggle,
  open,
  add,
}: {
  hs: Habit[];
  day: string;
  busy: boolean;
  toggle: (h: Habit) => void;
  open: (h: Habit) => void;
  add: () => void;
}) {
  const due = hs.filter((h) => isDueOnDate(h, day)),
    done = due.filter((h) => day in h.checks).length;
  return (
    <>
      <p className="dateline">
        {formatDay(day, { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <div className="section-head">
        <h1>Today</h1>
        <button className="primary" onClick={add}>
          ＋ Add habit
        </button>
      </div>
      <section className="panel">
        <h2>
          {due.length
            ? done + " of " + due.length + " done today"
            : "A little breathing room"}
        </h2>
        {due.length ? (
          <div className="progress">
            <i style={{ width: (done / due.length) * 100 + "%" }} />
          </div>
        ) : (
          <p>
            {hs.length
              ? "Nothing is due today. Your habit history is always here."
              : "Add your first habit to start your journal."}
          </p>
        )}
        {due.map((h) => (
          <HabitCard
            key={h.id}
            {...{ h, day, busy }}
            toggle={() => toggle(h)}
            open={() => open(h)}
          />
        ))}
      </section>
    </>
  );
}
