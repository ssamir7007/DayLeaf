"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/data";
import { Habit, scheduleLabel } from "@/lib/schedule";
import { localDay } from "@/lib/dates";
import { browser } from "@/lib/supabase/browser";
import { Brand } from "./Mark";
import { TodayView } from "./TodayView";
import { SettingsForm } from "./SettingsForm";
import { StatsPanel } from "./StatsPanel";
import { Heatmap } from "./Heatmap";
import { HabitForm } from "./HabitForm";
import { save, reason } from "./api";
type Modal = { kind: "form" | "history"; id?: string };
export default function Dashboard({
  initial,
  profile,
  email,
}: {
  initial: Habit[];
  profile: Profile;
  email: string;
}) {
  const [hs, setHs] = useState(initial),
    [p, setP] = useState(profile),
    [tab, setTab] = useState("Today"),
    [modal, setModal] = useState<Modal | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [arch, setArch] = useState(false),
    [now, setNow] = useState(() => new Date());
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    active = hs.find((h) => h.id === modal?.id),
    today = localDay(p.timezone, now);
  const reload = useCallback(async () => {
    const r = await fetch("/api/account?view=journal", { cache: "no-store" });
    if (!r.ok)
      throw new Error("Could not reload your journal. Refresh to try again.");
    const d = await r.json();
    setHs(d.habits);
    setP(d.profile);
  }, []);
  useEffect(() => {
    if (!profile.timezone_initialized) {
      save("timezone", {
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
        .then(reload)
        .catch((e) => setMsg(reason(e)));
    }
  }, [profile.timezone_initialized, reload]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal) dialog.current?.close();
  }, [modal]);
  async function run(action: string, fields: Record<string, unknown> = {}) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMsg("");
    try {
      await save(action, fields);
      if (action === "delete") {
        location.assign("/");
        return true;
      }
      await reload();
      setMsg(
        action.startsWith("test-")
          ? "Test message sent."
          : action === "sample"
            ? "Sample habits are ready in Habits."
            : action === "verify-send"
              ? "Verification code sent."
              : "Saved.",
      );
      return true;
    } catch (e) {
      setMsg(reason(e));
      await reload().catch(() => {});
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function check(h: Habit, day: string, done: boolean, note: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMsg("");
    const before = hs,
      checks = { ...h.checks };
    if (done) checks[day] = note;
    else delete checks[day];
    setHs(hs.map((x) => (x.id === h.id ? { ...x, checks } : x)));
    try {
      await save("check", { id: h.id, day, done, note });
    } catch (e) {
      setHs(before);
      setMsg(reason(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function open(m: Modal) {
    setMsg("");
    setModal(m);
  }
  const notice = (
    <p className="notice" role="status">
      {msg}
    </p>
  );
  return (
    <>
      <header className="mast">
        <div className="wrap mast-inner">
          <Brand />
          <nav className="tabs">
            {["Today", "Habits", "Settings"].map((t) => (
              <button
                className={t === tab ? "active" : ""}
                key={t}
                onClick={() => {
                  setTab(t);
                  setMsg("");
                }}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="journal">
        {!modal && notice}
        {tab === "Today" ? (
          <TodayView
            {...{ hs, busy }}
            day={today}
            toggle={(h) => check(h, today, !(today in h.checks), "")}
            open={(h) => open({ kind: "history", id: h.id })}
            add={() => open({ kind: "form" })}
          />
        ) : tab === "Settings" ? (
          <SettingsForm
            {...{ p, run, busy, email }}
            logout={async () => {
              const { error } = await browser().auth.signOut();
              if (error) setMsg("Sign out failed. Please try again.");
              else location.assign("/");
            }}
          />
        ) : (
          <>
            <div className="section-head">
              <h1>Habits</h1>
              <button
                className="primary"
                onClick={() => open({ kind: "form" })}
              >
                ＋ Add habit
              </button>
            </div>
            <div className="days">
              <button aria-pressed={!arch} onClick={() => setArch(false)}>
                Active
              </button>
              <button aria-pressed={arch} onClick={() => setArch(true)}>
                Archived
              </button>
            </div>
            {hs
              .filter((h) => h.archived === arch)
              .map((h) => (
                <article key={h.id} className="panel">
                  <h2>{h.name}</h2>
                  <p>{scheduleLabel(h.schedule)}</p>
                  <div className="actions">
                    <button onClick={() => open({ kind: "history", id: h.id })}>
                      View history
                    </button>
                    <button onClick={() => open({ kind: "form", id: h.id })}>
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run("archive", { id: h.id, archived: !arch })
                      }
                    >
                      {arch ? "Restore" : "Archive"}
                    </button>
                  </div>
                </article>
              ))}
            {!hs.some((h) => h.archived === arch) && (
              <p>
                {arch
                  ? "Archived habits will appear here."
                  : "Your journal is ready for its first habit."}
              </p>
            )}
          </>
        )}
      </main>
      <dialog
        ref={dialog}
        aria-labelledby="dialog-title"
        onClose={() => setModal(null)}
      >
        <div className="section-head">
          <h2 id="dialog-title">
            {modal?.kind === "history"
              ? active?.name
              : active
                ? "Edit habit"
                : "New habit"}
          </h2>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            ×
          </button>
        </div>
        {modal && notice}
        {modal?.kind === "form" && (
          <HabitForm
            key={modal.id || "new"}
            habit={active}
            busy={busy}
            submit={async (name, schedule) => {
              if (await run("habit", { id: modal.id, name, schedule }))
                setModal(null);
            }}
          />
        )}
        {modal?.kind === "history" && active && (
          <>
            <Heatmap
              h={active}
              today={today}
              busy={busy}
              check={(d, b, n) => check(active, d, b, n)}
            />
            <StatsPanel h={active} day={today} />
          </>
        )}
      </dialog>
    </>
  );
}
