import { describe, it, expect, vi } from "vitest";
import {
  localDay,
  localTime,
  weekday,
  monday,
  shift,
  validDay,
  formatDay,
} from "./dates";
import { Habit, Schedule, isDueOnDate, scheduleLabel } from "./schedule";
import { stats } from "./stats";
import { select, Preferences } from "./reminders/select";
import { normalizePhone, keyword, message } from "./sms/phone";
import { signed } from "./sms/signature";
import twilio from "twilio";
// Use the real signature algorithm, but fail the test if any code constructs
// a live Twilio API client.
vi.mock("twilio", async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof twilio }>();
  return {
    default: Object.assign(
      vi.fn(() => {
        throw new Error("Unexpected Twilio API call");
      }),
      {
        validateRequest: actual.default.validateRequest,
        getExpectedTwilioSignature: actual.default.getExpectedTwilioSignature,
      },
    ),
  };
});
function habit(s: Schedule = { type: "daily" }, days: string[] = []): Habit {
  return {
    id: "a",
    name: "Read",
    created_at: "2024-12-30",
    archived: false,
    schedule: s,
    periods: [{ effective_on: "2024-12-30", archived: false, schedule: s }],
    checks: Object.fromEntries(days.map((d) => [d, ""])),
  };
}
describe("local calendar", () => {
  it("handles month and year rollovers, leap days and Monday boundaries", () => {
    expect(monday("2025-01-05")).toBe("2024-12-30");
    expect(weekday("2025-01-06")).toBe(1);
    expect(shift("2024-03-01", -1)).toBe("2024-02-29");
    expect(validDay("2025-02-29")).toBe(false);
    expect(validDay("2024-02-29")).toBe(true);
    expect(formatDay("2025-01-01", { weekday: "long" })).toBe("Wednesday");
  });
  it("places late evenings on the correct local day through DST", () => {
    const at = new Date("2025-03-10T06:00:00Z");
    expect(localDay("America/Los_Angeles", at)).toBe("2025-03-09");
    expect(localTime("America/Los_Angeles", at)).toBe("23:00");
    expect(localDay("Asia/Tokyo", at)).toBe("2025-03-10");
  });
});
describe("schedules and streaks", () => {
  it("honors creation and archived periods", () => {
    const h = habit();
    expect(isDueOnDate(h, "2024-12-29")).toBe(false);
    expect(isDueOnDate(h, "2025-01-01")).toBe(true);
    h.periods.push({
      effective_on: "2025-01-02",
      schedule: h.schedule,
      archived: true,
    });
    expect(isDueOnDate(h, "2025-01-02")).toBe(false);
  });
  it("preserves gaps between due days and recomputes backfilled streaks", () => {
    const h = habit({ type: "weekdays", days: [1, 3, 5] }, [
      "2024-12-30",
      "2025-01-03",
      "2025-01-06",
    ]);
    expect(isDueOnDate(h, "2025-01-04")).toBe(false);
    expect(stats(h, "2025-01-07").current).toBe(2);
    h.checks["2025-01-01"] = "note";
    expect(stats(h, "2025-01-08")).toMatchObject({ current: 4, best: 4 });
    expect(stats(h, "2025-01-09")).toMatchObject({ current: 0, best: 4 });
  });
  it("counts weekly units and resets eligibility on Monday", () => {
    const h = habit({ type: "weekly", target: 2 }, [
      "2024-12-30",
      "2025-01-01",
      "2025-01-06",
    ]);
    expect(isDueOnDate(h, "2025-01-01")).toBe(true);
    expect(isDueOnDate(h, "2025-01-02")).toBe(false);
    expect(isDueOnDate(h, "2025-01-06")).toBe(true);
    expect(stats(h, "2025-01-08")).toMatchObject({ current: 1, best: 1 });
    expect(stats(h, "2025-01-13")).toMatchObject({ current: 0, best: 1 });
    expect(stats(h, "2025-01-05").windows[0]).toMatchObject({
      done: 2,
      due: 2,
    });
  });
  it("names each schedule", () => {
    expect([
      scheduleLabel({ type: "daily" }),
      scheduleLabel({ type: "weekly", target: 2 }),
      scheduleLabel({ type: "weekdays", days: [1, 7] }),
    ]).toEqual(["Every day", "2 times a week", "Mon, Sun"]);
  });
});
describe("reminder eligibility", () => {
  const p: Preferences = {
    timezone: "America/Chicago",
    reminder_time: "09:00",
    email_enabled: true,
    sms_enabled: true,
    last_email_sent_on: null,
    last_sms_sent_on: null,
  };
  const at = new Date("2025-01-02T15:00Z");
  it("checks time and each channel independently", () => {
    expect(select(p, [habit()], new Date(at.getTime() - 60000)).email).toBe(
      false,
    );
    expect(select(p, [habit()], at)).toMatchObject({ sms: true, email: true });
    expect(
      select(
        { ...p, last_sms_sent_on: "2025-01-02", email_enabled: false },
        [habit()],
        at,
      ),
    ).toMatchObject({ sms: false, email: false });
    expect(
      select(
        { ...p, last_email_sent_on: "2025-01-02", sms_enabled: false },
        [habit()],
        at,
      ),
    ).toMatchObject({ sms: false, email: false });
  });
  it("skips completed and non-due habits", () =>
    expect(
      select(
        p,
        [
          habit(undefined, ["2025-01-02"]),
          habit({ type: "weekdays", days: [1] }),
        ],
        at,
      ),
    ).toMatchObject({ pending: [], email: false, sms: false }));
});
describe("SMS", () => {
  it("normalizes a valid international number and rejects invalid numbers", () => {
    expect(normalizePhone("+1 (415) 555-2671")).toBe("+14155552671");
    expect(() => normalizePhone("1234")).toThrow();
  });
  it.each([" stop ", "StopAll", "unsubscribe", "CANCEL", "end", "quit"])(
    "parses opt-out %s",
    (w) => expect(keyword(w)).toBe("stop"),
  );
  it("handles START, UNSTOP, HELP and ignores arbitrary messages", () => {
    expect([" Start", "unstop ", " help ", "done"].map(keyword)).toEqual([
      "start",
      "start",
      "help",
      null,
    ]);
    expect(message(["Read", "Walk"])).toContain(
      "Read, Walk. Reply STOP to opt out",
    );
  });
  it("keeps long reminders compact and preserves opt-out instructions", () => {
    const body = message(
      Array.from({ length: 25 }, (_, i) => "Read " + i + " " + "a".repeat(75)),
    );
    expect(body.length).toBeLessThanOrEqual(320);
    expect(body).toMatch(/more\. Reply STOP to opt out$/);
  });
  it("rejects missing or tampered signatures using local validation only", () => {
    const url = "https://example.com/api/sms/inbound",
      params = { Body: "STOP", From: "+14155552671" };
    const signature = twilio.getExpectedTwilioSignature("secret", url, params);
    const validator = vi.spyOn(twilio, "validateRequest");
    expect(signed("secret", null, url, params)).toBe(false);
    expect(validator).not.toHaveBeenCalled();
    expect(signed("secret", signature, url, params)).toBe(true);
    expect(signed("secret", signature, url, { ...params, Body: "START" })).toBe(
      false,
    );
    validator.mockRestore();
  });
});
