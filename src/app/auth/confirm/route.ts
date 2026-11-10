import { server } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams,
    db = await server();
  const result = q.get("code")
    ? await db.auth.exchangeCodeForSession(q.get("code")!)
    : await db.auth.verifyOtp({
        token_hash: q.get("token_hash") || "",
        type: (q.get("type") || "signup") as EmailOtpType,
      });
  const path = result.error
    ? "/auth?error=link"
    : q.get("type") === "recovery"
      ? "/auth?mode=password"
      : "/dashboard";
  return NextResponse.redirect(new URL(path, process.env.APP_URL));
}
