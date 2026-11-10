# Dayleaf

**Live app:** [Open Dayleaf on Vercel](https://dayleaf-ssamir.vercel.app)

A responsive personal habit journal built with Next.js App Router, TypeScript and Supabase. The signed-in journal has Today, Habits and Settings views. The public landing page includes a small interactive example. Email and SMS reminders are independently opt-in.

## Run on Windows

1. Install Node.js 22.12 or newer and open PowerShell in the project directory.
2. Install dependencies and copy the environment template.

   ```powershell
   npm.cmd install
   Copy-Item .env.example .env.local
   ```

3. Complete the Supabase steps below and fill in the account and application variables. Configure each reminder provider before enabling its channel.
4. Start the server and open [Dayleaf locally](http://localhost:3000). Use the same hostname and port in your browser and `APP_URL`.

   ```powershell
   npm.cmd run dev
   ```

5. Create an account, confirm your email and sign in. In Settings, check your detected time zone and choose **Load sample data** for three habits with about two months of history. Loading again is safe. Select **History** on a habit to backfill an eligible date or change its note.

The test suite and production compilation run without live provider credentials.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd start
```

## Supabase database and authentication

1. Create a hosted Supabase Free project. Enable the Data API for the public schema. Open **SQL Editor** and run the complete contents of `supabase/migrations/001_dayleaf.sql`, followed by `002_sample.sql`, once each. Both use standard Postgres and Supabase's existing Auth schema and roles.
2. Copy the project URL, publishable key (or legacy anon key), and secret key (or legacy service role key) from the project Connect/API Keys screens. Only the publishable key and URL belong in public browser configuration.
3. Enable the Email provider and email confirmations. Under Authentication URL Configuration, set the Site URL to `http://localhost:3000` for local setup. Allow `http://localhost:3000/auth/confirm` and `http://localhost:3000/auth/confirm?type=recovery`. Add the equivalent HTTPS URLs when deploying.
4. In **Email Templates**, use the following link in the confirmation and recovery templates respectively. These templates send the token hash to the app, which verifies the token and establishes a cookie session. Use a separate Supabase project for development if testing local and production email flows concurrently. The templates use the project's Site URL.

   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup"
     >Confirm email</a
   >
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery"
     >Choose a new password</a
   >
   ```

5. For signup and recovery emails to public users, configure custom SMTP in Supabase Authentication. With Resend, verify your domain, use the SMTP settings shown in its dashboard, and supply an authorized sender. Supabase sends these account emails independently of the app's reminder preferences. [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp) · [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
6. For optional Google login, create a Google Cloud OAuth web client. Add the Supabase callback URL shown under **Authentication → Providers → Google** as an authorized redirect URI. Enable the provider with the client ID and secret, then set `NEXT_PUBLIC_GOOGLE_ENABLED=true` and restart or rebuild. [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Environment variables

| Variable                        | Value                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | The project's HTTPS URL.                                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable or legacy anon key.                                                                         |
| `NEXT_PUBLIC_GOOGLE_ENABLED`    | Set to `true` after configuring Google. Defaults to `false`.                                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only Supabase secret or service role key for scoped administrative operations.                            |
| `APP_URL`                       | Canonical origin such as `http://localhost:3000` or the production HTTPS origin.                                 |
| `CRON_SECRET`                   | Random secret shared with the GitHub workflow.                                                                   |
| `UNSUBSCRIBE_SECRET`            | Separate random signing key for unsubscribe links and one-way phone bindings. Keep it stable across deployments. |
| `RESEND_API_KEY`                | Server-side Resend sending key.                                                                                  |
| `EMAIL_FROM`                    | Sender on a verified domain, for example `Dayleaf <journal@example.com>`.                                        |
| `TWILIO_ACCOUNT_SID`            | Account SID for the messaging number and Verify service.                                                         |
| `TWILIO_AUTH_TOKEN`             | Account auth token used to authenticate the SDK and verify webhook signatures.                                   |
| `TWILIO_VERIFY_SERVICE_SID`     | Verify service SID beginning with `VA`.                                                                          |
| `TWILIO_FROM_NUMBER`            | SMS-capable Twilio sender in international E.164 format.                                                         |

Generate each random secret separately with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep secret values in the ignored `.env.local` and the deployment's encrypted environment settings.

## Resend

1. Add your sending domain to Resend, publish its required DNS records and wait for verification.
2. Create a sending API key. Set `RESEND_API_KEY` and `EMAIL_FROM`, then restart the app.
3. Sign in and use **Settings → Send me a test email**. Test messages and reminders include a signed unsubscribe URL. The GET link and one-click POST disable email reminders without a login. Enable the email checkbox and save preferences to receive scheduled messages. [Resend Next.js integration](https://resend.com/docs/send-with-nextjs)

## Twilio

1. Create a Twilio account and obtain an SMS-capable sender. Trial accounts have recipient restrictions. Copy the account SID, auth token and sending number into the corresponding variables.
2. Create a Twilio Verify service with SMS enabled and copy its service SID. Verify delivers the one-time code. The app sends daily reminders through Programmable Messaging. [Verify setup](https://www.twilio.com/docs/verify/quickstarts/node-express)
3. For US recipients using a US ten-digit local sender, register the appropriate A2P 10DLC brand and campaign, provide the real opt-in flow and sample messages, and associate the number with the registered Messaging Service. Wait for approval. US toll-free senders follow Twilio's separate toll-free verification process. [A2P registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc) · [Toll-free verification](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding)
4. Configure the incoming message webhook for the number or Messaging Service as HTTP POST to `https://YOUR-DOMAIN/api/sms/inbound`. Ensure incoming messages are forwarded to this webhook. Enable Advanced Opt-Out, configure the required STOP/START/HELP keywords and set HELP text to include the app's Settings URL. Twilio replies automatically when it supplies `OptOutType`. The app returns HELP text for ordinary signed HELP messages. [Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)
5. Use a publicly reachable HTTPS origin for webhook testing. The external URL must match `APP_URL` exactly for signature validation. The app supplies the signed delivery status callback URL `/api/sms/status` with each send. [Webhook signatures](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
6. In Settings enter a number with its country code, request a code, verify it, check the explicit consent box and enable SMS. Send a test text. Reply STOP and refresh Settings to see the disable notice. A subsequent signed START can reconnect a previously consented number. Manually removing or disabling the number clears its consent and binding.
7. Each account can request three codes and make five verification attempts per 15 minutes. Each test channel permits three sends per hour. The counters are atomic across server instances.

## Deploy to Vercel

1. Push this project to a GitHub repository. In Vercel choose **Add New → Project**, import the repository and use the Next.js preset with the repository root as the application directory.
2. Select a compatible Node version. Keep the default install and build commands. Set the variables from the table in Production, using the permanent HTTPS origin for `APP_URL`.
3. Deploy. Update the Supabase Site URL, redirect allowlist, auth templates and Twilio webhook configuration for this origin. Redeploy after environment changes, particularly public variables that Next.js embeds at build time.
4. Test signup, recovery, account isolation with two accounts, and Settings test sends on the deployed instance. On an iPhone, Safari's **Share → Add to Home Screen** uses the app manifest and PNG icon.

## Hourly reminders with GitHub Actions

1. Push `.github/workflows/reminders.yml` to the repository's default branch and enable Actions.
2. Under **Settings → Secrets and variables → Actions**, add repository secrets `APP_URL` (the production HTTPS origin) and `CRON_SECRET` (exactly the same value as Vercel).
3. Enable a reminder on a test account, choose a local time earlier than the current time, and leave a habit due and incomplete. In **Actions → Hourly habit reminders**, select **Run workflow**. Run a second time and verify each scheduled channel delivers only once that local day.
4. The workflow calls the protected POST endpoint at minute 17 each hour, following its cursor until every enabled profile has been considered. Vercel Hobby Cron permits only daily schedules, so GitHub Actions supplies the hourly trigger. Scheduled workflows may run late. [Vercel cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) · [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Delivery happens at the first run at or after the chosen local time on that calendar day. If the final run precedes a late-night setting or the scheduler is unavailable through midnight, the previous day's reminder expires. Each channel reserves a unique user/day slot before contacting its provider and updates its last-sent date after acceptance. A provider timeout leaves the slot reserved because delivery may already have occurred. Other users and channels still run. The workflow surfaces failure counts and server logs omit phone numbers and message contents.

## Calendar and data ownership

- Dates are plain local `YYYY-MM-DD` values in the saved IANA time zone. Weeks begin Monday. Schedule changes and archive/restore actions take effect on their local date. Earlier dates retain their schedule history.
- A weekly target can be met on any distinct days. Today keeps a completed habit visible for that day and stops offering subsequent days after the quota is reached. Daily and weekday streaks skip non-due days. Weekly streaks count weeks that met the target. The open day or week can still be completed.
- The rolling 7- and 30-day summaries count due opportunities. A weekly habit contributes up to its quota across eligible dates in the window, accounting for completions earlier in the same week.
- RLS scopes rows by authenticated owner. Composite foreign keys enforce habit/check-in ownership. Sensitive profile changes and rate limits use authenticated server routes. SMS enrollment requires both verification and stored consent. STOP removes the raw number while preserving a keyed binding for consented START replies.
- Settings exports the user's journal, notes, dated schedule changes, preferences and operational records as JSON. Deleting the account requires typing `DELETE` and cascades through the app tables. Stats are derived from history each time.
