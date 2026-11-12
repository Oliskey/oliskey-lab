# Deploy Oliskey Lab (Supabase + Vercel)

Tested locally: migrations run twice on a fresh database without error, all 11 tables have Row Level Security on,
the Vercel entry (`api/index.ts`) answers `/api/health` and signs up a user in production mode, and 41 tests pass.

## 1. Supabase (database)
1. Create a project (for example `oliskey-lab`, region `eu-west-2`).
2. Apply the migrations in `supabase/migrations/` in order — either:
   - `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - paste each file into the SQL editor, or
   - set `DATABASE_URL` locally and run `npm run migrate`.
3. Copy the **Transaction pooler** connection string (port 6543) for Vercel.

The Lab does not use Supabase's Data API or anon key. The second migration turns on Row Level Security with no
policies and revokes the anon/authenticated roles, so the tables can't be read through the Data API; the server
connects as the table owner over the pooler.

## 2. Vercel (web app + API)
1. Import the GitHub repo `Oliskey/oliskey-lab` as a new project (framework: Vite; `vercel.json` sets the rest).
2. Environment variables (Production and Preview):
   - `DATABASE_URL` — the pooler string from step 1.3
   - `LAB_JWT_SECRET` — a long random value (`openssl rand -base64 48`)
   - `TRUST_PROXY=1`
   - `GEMINI_API_KEY` (optional) and `GEMINI_MODEL` (optional)
3. Deploy, then open `https://<project>.vercel.app/api/health` — it should answer `{"ok":true}`.
4. Domains: add `lab.oliskey.com` and create the CNAME record Vercel shows.

## Known limits
- Rate limits are kept in memory per serverless instance, so they are weaker on Vercel than on one server.
  A shared store (for example Upstash Redis) is the next step if abuse appears.
- TLS to Supabase is encrypted; set `DATABASE_CA` to Supabase's certificate to also verify the server identity.
