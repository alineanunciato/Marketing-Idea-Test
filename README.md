# Name My Thing

Describe a project in one line. Claude, OpenAI and Gemini each suggest 3 names. Visitors upvote their favorite, and the top-voted names show on the homepage.

Built with Next.js (App Router) and Supabase.

## How it works

- **`POST /api/generate`** asks all three models at the same time, using each provider's structured output to get back `{ "names": [...] }`. It cleans the results (trims them, drops duplicates, keeps 3 per model) and saves a `projects` row plus one `names` row per suggestion. If one model fails, the other models' names still show.
- **`POST /api/vote`** increments `names.votes` (the single vote column) through the atomic `upvote()` Postgres function. Each visitor gets one favorite per project, tracked in an httpOnly cookie.
- **The homepage** renders the 12 top-voted names, each with the project it was named for and the model that suggested it.

All database access happens on the server with the Supabase secret key. Row-level security allows public reads only, and only the service role can run `upvote()`.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the values:

   | Variable | Where to get it |
   | --- | --- |
   | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys (the `sb_secret_…` key; the legacy `service_role` key also works, and `SUPABASE_SERVICE_ROLE_KEY` is accepted as the name) |
   | `ANTHROPIC_API_KEY` | console.anthropic.com |
   | `OPENAI_API_KEY` | platform.openai.com |
   | `GEMINI_API_KEY` | aistudio.google.com |

   Default models are `claude-opus-5-5`, `gpt-5.5` and `gemini-3.5-flash`. Override them with `ANTHROPIC_MODEL`, `OPENAI_MODEL` and `GEMINI_MODEL`.

3. Run it:

   ```bash
   npm install
   npm run dev
   ```

## Deploy to Cloudflare Workers

The app runs on Cloudflare Workers through the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare). The config is in `wrangler.jsonc`, and the Worker is named `marketing-idea-test`. The `name` in `wrangler.jsonc` must match the Worker's name in the Cloudflare dashboard.

### With Workers Builds (the Cloudflare dashboard's Git integration)

Connect the repo to the Worker, then use these settings under **Settings → Build**:

| Setting | Value |
| --- | --- |
| Production branch | the branch to deploy from |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

Leave the build command as `npx opennextjs-cloudflare build`, not `npm run build`. Plain `next build` doesn't produce the files the deploy step needs.

Add the app keys under the Worker's **Settings → Variables and Secrets**, each with type **Secret**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `GEMINI_API_KEY`. Every push to the production branch then deploys automatically.

### With GitHub Actions

Use this instead of Workers Builds, not alongside it.

1. In GitHub, go to **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `CLOUDFLARE_API_TOKEN`: a token made from the "Edit Cloudflare Workers" template
   - `CLOUDFLARE_ACCOUNT_ID`: shown on your account's Workers & Pages overview
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
2. Deploy: go to **Actions → Deploy to Cloudflare → Run workflow**. The workflow also runs on every push to `main`. It builds the app, deploys it, and copies the five app keys into the Worker as secrets.

### After deploying

The app is live at `https://marketing-idea-test.<your-subdomain>.workers.dev`. To use your own domain, go to the Worker's **Settings → Domains & Routes** in Cloudflare.

To deploy from your own machine instead, run `npx wrangler login`, then `npm run deploy`. Set the app keys once with `npx wrangler secret put <NAME>`. To test the production build locally in the Workers runtime, copy `.dev.vars.example` to `.dev.vars`, fill it in, and run `npm run preview`.

## Notes

- The Claude call turns on server-side refusal fallbacks (`fallbacks: "default"`), so a safety-classifier decline is retried on a fallback model instead of returning nothing.
- The cookie-based "one vote per project" limit is meant to keep things honest, not to stop abuse: clearing cookies lets someone vote again. Before a public launch, add rate limiting (for example, per IP) to `/api/generate` and `/api/vote`, because every generate request makes three paid LLM calls.
