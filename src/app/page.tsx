import Link from "next/link";
import { redirect } from "next/navigation";
import { server } from "@/lib/supabase/server";
import Landscape from "@/components/Landscape";
import Preview from "@/components/Preview";
import { Brand } from "@/components/Mark";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const db = await server();
    if ((await db.auth.getUser()).data.user) redirect("/dashboard");
  }
  return (
    <>
      <header className="mast">
        <div className="wrap mast-inner">
          <Brand />
          <nav>
            <Link href="/auth">Sign in</Link>
            <Link className="primary" href="/auth?mode=signup">
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="wrap landing">
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Small habits.
              <br />
              <em>Steady growth.</em>
            </h1>
            <p>
              A quiet space to track your habits, notice your progress, and
              begin again each day.
            </p>
            <Link className="primary large" href="/auth?mode=signup">
              Start your journal <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="art">
            <Landscape />
          </div>
        </section>
        <Preview />
      </main>
      <footer className="wrap">
        <Brand />
        <span>Your personal habit journal</span>
      </footer>
    </>
  );
}
