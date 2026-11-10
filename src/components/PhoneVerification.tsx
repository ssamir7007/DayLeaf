import { useState } from "react";
import type { Profile } from "@/lib/data";
export type Run = (
  action: string,
  fields?: Record<string, unknown>,
) => Promise<boolean>;
export function PhoneVerification({
  p,
  run,
  busy,
}: {
  p: Profile;
  run: Run;
  busy: boolean;
}) {
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [consent, setConsent] = useState(false);
  return (
    <section className="panel">
      <h2>Text reminders</h2>
      {p.sms_notice && <p role="status">{p.sms_notice}</p>}
      {p.phone_e164 && (
        <p>
          {p.phone_e164} ·{" "}
          {p.phone_verified_at ? "Verified" : "Awaiting verification"}
        </p>
      )}
      {!p.sms_enabled && (
        <>
          {!p.phone_verified_at && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("verify-send", { phone: phone || p.phone_e164 });
                }}
              >
                <label>
                  Phone number with country code
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    placeholder={p.phone_e164 || "+1 415 555 2671"}
                    onChange={(e) => setPhone(e.target.value)}
                    required={!p.phone_e164}
                  />
                </label>
                <button disabled={busy}>
                  {p.phone_e164 ? "Send a new code" : "Send verification code"}
                </button>
              </form>
              {p.phone_e164 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run("verify-check", { code });
                  }}
                >
                  <label>
                    Verification code
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                  <button disabled={busy}>Verify number</button>
                </form>
              )}
            </>
          )}
          {p.phone_verified_at && (
            <label className="inline">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I agree to receive daily habit reminder texts at this number.
              Message and data rates may apply. Reply STOP to cancel, HELP for
              help.
            </label>
          )}
        </>
      )}
      <label className="inline">
        <input
          type="checkbox"
          checked={p.sms_enabled}
          disabled={
            busy || (!p.sms_enabled && (!consent || !p.phone_verified_at))
          }
          onChange={async (e) => {
            await run(e.target.checked ? "sms-enable" : "sms-disable", {
              consent,
            });
            setConsent(false);
            setPhone("");
          }}
        />
        SMS reminders
      </label>
      <div className="actions">
        {p.sms_enabled && (
          <button disabled={busy} onClick={() => run("test-sms")}>
            Send me a test text
          </button>
        )}
        {!p.sms_enabled && p.phone_e164 && (
          <button disabled={busy} onClick={() => run("sms-disable")}>
            Remove phone number
          </button>
        )}
      </div>
    </section>
  );
}
