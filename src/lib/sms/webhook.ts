import "server-only";
import { signed } from "./signature";
export async function fields(req: Request, path: string) {
  const form = await req.formData(),
    params = Object.fromEntries(Array.from(form, ([k, v]) => [k, String(v)]));
  return process.env.TWILIO_AUTH_TOKEN &&
    signed(
      process.env.TWILIO_AUTH_TOKEN,
      req.headers.get("x-twilio-signature"),
      new URL(path, process.env.APP_URL).href,
      params,
    )
    ? params
    : null;
}
