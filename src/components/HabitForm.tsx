import { useState } from "react";
import { Habit, Schedule } from "@/lib/schedule";
export function HabitForm({
  habit,
  submit,
  busy,
}: {
  habit?: Habit;
  submit: (name: string, s: Schedule) => void;
  busy: boolean;
}) {
  const [type, setType] = useState<Schedule["type"]>(
      habit?.schedule.type || "daily",
    ),
    [days, setDays] = useState(
      habit?.schedule.type === "weekdays" ? habit.schedule.days : [1, 3, 5],
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit(
          String(f.get("name")),
          type === "weekly"
            ? { type, target: Number(f.get("target")) }
            : type === "weekdays"
              ? { type, days }
              : { type },
        );
      }}
    >
      <label>
        Habit name
        <input
          defaultValue={habit?.name}
          name="name"
          required
          maxLength={100}
          placeholder="Read a few pages"
        />
      </label>
      <label>
        Schedule
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="daily">Every day</option>
          <option value="weekdays">Specific weekdays</option>
          <option value="weekly">Times per week</option>
        </select>
      </label>
      {type === "weekdays" && (
        <fieldset>
          <legend>Due on</legend>
          <div className="days">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (name, i) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={days.includes(i + 1)}
                  onClick={() =>
                    setDays(
                      days.includes(i + 1)
                        ? days.filter((d) => d !== i + 1)
                        : [...days, i + 1].sort(),
                    )
                  }
                >
                  {name}
                </button>
              ),
            )}
          </div>
        </fieldset>
      )}
      {type === "weekly" && (
        <label>
          Weekly target
          <input
            type="number"
            name="target"
            min="1"
            max="7"
            required
            defaultValue={
              habit?.schedule.type === "weekly" ? habit.schedule.target : 3
            }
          />
        </label>
      )}
      <button
        className="primary"
        disabled={busy || (type === "weekdays" && !days.length)}
      >
        Save habit
      </button>
    </form>
  );
}
