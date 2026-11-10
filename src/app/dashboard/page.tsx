import { redirect } from "next/navigation";
import { account } from "@/lib/supabase/server";
import { profile, habits } from "@/lib/data";
import Dashboard from "@/components/Dashboard";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await account().catch(() => null);
  if (!a) redirect("/auth");
  const [p, hs] = await Promise.all([profile(a.user.id), habits(a.user.id)]);
  return <Dashboard profile={p} initial={hs} email={a.user.email || ""} />;
}
