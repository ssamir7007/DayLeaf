import twilio from "twilio";
export function signed(
  token: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
) {
  return !!signature && twilio.validateRequest(token, signature, url, params);
}
