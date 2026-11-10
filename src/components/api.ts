export async function save(
  action: string,
  fields: Record<string, unknown> = {},
) {
  const r = await fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...fields }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Please try again.");
}
export const reason = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
