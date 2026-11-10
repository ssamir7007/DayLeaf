import { useState } from "react";
import { formatDay } from "@/lib/dates";
export function DayDetail({
  day,
  note,
  busy,
  onSave,
}: {
  day: string;
  note: string | undefined;
  busy: boolean;
  onSave: (done: boolean, note: string) => void;
}) {
  const [text, setText] = useState(note || "");
  return (
    <section className="day-detail">
      <h3>
        {formatDay(day, { weekday: "long", month: "short", day: "numeric" })}
      </h3>
      <label>
        Check-in note (optional)
        <textarea
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() => onSave(true, text)}
        >
          {note === undefined ? "Mark done" : "Save note"}
        </button>
        {note !== undefined && (
          <button disabled={busy} onClick={() => onSave(false, "")}>
            Undo check-in
          </button>
        )}
      </div>
    </section>
  );
}
