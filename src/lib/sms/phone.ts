import { parsePhoneNumberFromString } from "libphonenumber-js/max";
export function normalizePhone(raw: string) {
  const n = parsePhoneNumberFromString(raw, { extract: false });
  if (!n?.isValid() || n.ext)
    throw new Error(
      "Enter a valid number including the country code, such as +1.",
    );
  return n.number;
}
export function keyword(body: string) {
  const word = body.trim().toUpperCase();
  if (
    [
      "STOP",
      "STOPALL",
      "UNSUBSCRIBE",
      "CANCEL",
      "END",
      "QUIT",
      "REVOKE",
      "OPTOUT",
    ].includes(word)
  )
    return "stop";
  if (["START", "UNSTOP"].includes(word)) return "start";
  return word === "HELP" ? "help" : null;
}
export function message(names: string[]) {
  const prefix = "Dayleaf: Here's what's on your list today: ",
    suffix = ". Reply STOP to opt out";
  const included: string[] = [];
  for (const name of names) {
    const remaining = names.length - included.length - 1;
    const tail = remaining ? " and " + remaining + " more" : "";
    if ((prefix + [...included, name].join(", ") + tail + suffix).length > 320)
      break;
    included.push(name);
  }
  const extra = names.length - included.length;
  return (
    prefix +
    included.join(", ") +
    (extra ? " and " + extra + " more" : "") +
    suffix
  );
}
