import { Habit, scheduleLabel } from "@/lib/schedule";
export function HabitCard({
  h,
  day,
  busy,
  toggle,
  open,
}: {
  h: Habit;
  day: string;
  busy: boolean;
  toggle: () => void;
  open: () => void;
}) {
  const done = day in h.checks;
  return (
    <article className="habit-card">
      <button
        disabled={busy}
        className={"habit-check " + (done ? "completed" : "")}
        aria-label={(done ? "Undo " : "Complete ") + h.name}
        aria-pressed={done}
        onClick={toggle}
      >
        <span className="checkbox">{done ? "✓" : ""}</span>
        <span>
          {h.name}
          <small>{scheduleLabel(h.schedule)}</small>
        </span>
      </button>
      <button
        className="plain"
        onClick={open}
        aria-label={"History for " + h.name}
      >
        History ↗
      </button>
    </article>
  );
}
