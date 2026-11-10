"use client";
import { useState } from "react";
import Link from "next/link";
import { browser } from "@/lib/supabase/browser";
export default function Auth({
  mode,
  invalid,
}: {
  mode: string;
  invalid: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(
      invalid ? "This link has expired. Request a new link." : "",
    );
  const titles: Record<string, string> = {
    signup: "Start your journal",
    login: "Welcome back",
    reset: "Reset your password",
    password: "Choose a new password",
  };
  return (
    <section className="panel auth-panel">
      <h1>{titles[mode] || titles.login}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg("");
          const f = new FormData(e.currentTarget),
            email = String(f.get("email") || ""),
            password = String(f.get("password") || "");
          try {
            const client = browser(),
              redirect = location.origin + "/auth/confirm";
            if (mode === "signup") {
              const { data, error } = await client.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: redirect },
              });
              if (error) throw error;
              if (data.session) location.assign("/dashboard");
              else setMsg("Check your inbox to confirm your email.");
            } else if (mode === "reset") {
              const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: redirect + "?type=recovery",
              });
              if (error) throw error;
              setMsg(
                "If this email has an account, a reset link is on its way.",
              );
            } else if (mode === "password") {
              const { error } = await client.auth.updateUser({ password });
              if (error) throw error;
              location.assign("/dashboard");
            } else {
              const { error } = await client.auth.signInWithPassword({
                email,
                password,
              });
              if (error) throw error;
              location.assign("/dashboard");
            }
          } catch (e) {
            setMsg(
              e instanceof Error && e.name.startsWith("Auth")
                ? e.message
                : "Account service unavailable. Check your connection or the app configuration.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "password" && (
          <label>
            Email address
            <input name="email" type="email" required autoComplete="email" />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={mode === "login" ? 1 : 8}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : {
                signup: "Create account",
                reset: "Send reset link",
                password: "Save password",
                login: "Sign in",
              }[mode] || "Sign in"}
        </button>
      </form>
      <p role="status">{msg}</p>
      {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" &&
        (mode === "login" || mode === "signup") && (
          <button
            className="outline"
            disabled={busy}
            onClick={async () => {
              try {
                const { error } = await browser().auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: location.origin + "/auth/confirm" },
                });
                if (error) throw error;
              } catch {
                setMsg(
                  "Google sign-in is unavailable. Try email and password.",
                );
              }
            }}
          >
            Continue with Google
          </button>
        )}
      <div className="auth-links">
        <Link href={mode === "login" ? "/auth?mode=signup" : "/auth"}>
          {mode === "login" ? "Create an account" : "Back to sign in"}
        </Link>
        {mode === "login" && (
          <Link href="/auth?mode=reset">Forgot password?</Link>
        )}
      </div>
    </section>
  );
}
