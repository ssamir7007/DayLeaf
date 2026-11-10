"use client";
import { useState } from "react";
export default function Preview() {
  const [done, setDone] = useState([true, false, false]);
  return (
    <section className="preview">
      <div className="section-head">
        <h2>A page from your journal</h2>
        <span className="preview-tag">Interactive preview</span>
      </div>
      <div className="preview-grid">
        <article className="panel">
          <div className="card-title">
            <span className="tile">☀</span>
            <h3>Today’s habits</h3>
            <small>{done.filter(Boolean).length} of 3 done</small>
          </div>
          {["Drink a glass of water", "Read a few pages", "Go for a walk"].map(
            (n, i) => (
              <button
                key={n}
                className={"check-row " + (done[i] ? "completed" : "")}
                aria-pressed={done[i]}
                onClick={() => setDone(done.map((v, j) => (i === j ? !v : v)))}
              >
                <span className="checkbox">{done[i] ? "✓" : ""}</span>
                {n}
              </button>
            ),
          )}
        </article>
        <article className="panel growth">
          <div className="card-title">
            <span className="tile wheat">▦</span>
            <h3>Habit history</h3>
          </div>
          <p>Read a few pages</p>
          <div
            className="miniheat"
            aria-label="Sample twelve-week reading history"
          >
            {Array.from({ length: 84 }, (_, i) => (
              <i
                key={i}
                className={
                  (i === 83 ? done[1] : (i * 31) % 13 > 3) ? "hit" : ""
                }
              />
            ))}
          </div>
          <div className="legend">
            <i />
            No check-in <i className="hit" />
            Completed
          </div>
        </article>
      </div>
    </section>
  );
}
