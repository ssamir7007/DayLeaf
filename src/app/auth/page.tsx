import Link from "next/link";
import Auth from "./Auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        ❧ Dayleaf
      </Link>
      {process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY ? (
        <Auth key={q.mode} mode={q.mode || "login"} invalid={!!q.error} />
      ) : (
        <section className="panel auth-panel">
          <h1>Account setup is pending</h1>
          <p>Connect this installation to Supabase to enable sign-up and sign-in.</p>
          <Link className="outline" href="/">Back to the preview</Link>
        </section>
      )}
    </main>
  );
}
