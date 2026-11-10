import { Habit } from "@/lib/schedule";
import { stats } from "@/lib/stats";
export function StatsPanel({ h, day }: { h: Habit; day: string }) {
  const s = stats(h, day),
    unit = h.schedule.type === "weekly" ? "weeks" : "due days";
  return (
    <section>
      <h3>Consistency</h3>
      <dl className="stats">
        <div>
          <dt>Current streak</dt>
          <dd>
            {s.current} <small>{unit}</small>
          </dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>
            {s.best} <small>{unit}</small>
          </dd>
        </div>
        {s.windows.map((w, i) => (
          <div key={i}>
            <dt>Last {i ? 30 : 7} days</dt>
            <dd>
              {w.done} of {w.due} <small>due days completed</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
