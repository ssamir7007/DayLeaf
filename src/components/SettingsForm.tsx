import { useState } from "react";
import type { Profile } from "@/lib/data";
import { PhoneVerification, Run } from "./PhoneVerification";
export function SettingsForm({
  p,
  run,
  busy,
  email,
  logout,
}: {
  p: Profile;
  run: Run;
  busy: boolean;
  email: string;
  logout: () => void;
}) {
  const [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState("");
  return (
    <>
      <h1>Settings</h1>
      <section className="panel">
        <h2>Reminder preferences</h2>
        <p>Receive a gentle reminder when you have habits left for the day.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run("preferences", {
              zone: f.get("zone"),
              time: f.get("time"),
              email: f.has("email"),
            });
          }}
        >
          <label>
            Time zone
            <input
              name="zone"
              list="zones"
              defaultValue={p.timezone}
              required
            />
          </label>
          <datalist id="zones">
            {Intl.supportedValuesOf("timeZone").map((z) => (
              <option key={z}>{z}</option>
            ))}
          </datalist>
          <label>
            Local reminder time
            <input
              type="time"
              name="time"
              defaultValue={p.reminder_time.slice(0, 5)}
              required
            />
          </label>
          <small>Reminders run hourly, at the first run after this time.</small>
          <label className="inline">
            <input
              name="email"
              type="checkbox"
              defaultChecked={p.email_enabled}
            />
            Email reminders
          </label>
          <div className="actions">
            <button disabled={busy} className="primary">
              Save preferences
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run("test-email")}
            >
              Send me a test email
            </button>
          </div>
        </form>
      </section>
      <PhoneVerification {...{ p, run, busy }} />
      <section className="panel">
        <h2>Your account</h2>
        <p>{email}</p>
        <div className="actions">
          <a className="outline" href="/api/account" download>
            Export JSON
          </a>
          <button onClick={() => run("sample")} disabled={busy}>
            Load sample data
          </button>
          <button onClick={logout}>Sign out</button>
        </div>
        <hr />
        {!deleting ? (
          <button className="danger" onClick={() => setDeleting(true)}>
            Delete account
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run("delete", { confirm: confirmation });
            }}
          >
            <label>
              Permanently delete your account and all journal entries? Type
              DELETE to confirm.
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <div className="actions">
              <button
                className="danger"
                disabled={busy || confirmation !== "DELETE"}
              >
                Permanently delete
              </button>
              <button type="button" onClick={() => setDeleting(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
