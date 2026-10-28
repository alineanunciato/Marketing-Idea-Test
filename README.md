# Name My Thing

Describe a project in one line. Claude, OpenAI and Gemini each suggest 3 names. Visitors upvote their favorite, and the top-voted names show on the homepage.

Built with Next.js (App Router) and Supabase.

## How it works

- **`POST /api/generate`** asks all three models at the same time, using each provider's structured output to get back `{ "names": [...] }`. It cleans the results (trims them, drops duplicates, keeps 3 per model) and saves a `projects` row plus one `names` row per suggestion. If one model fails, the other models' names still show.
- **`POST /api/vote`** increments `names.votes` (the single vote column) through the atomic `upvote()` Postgres function. Each visitor gets one favorite per project, tracked in an httpOnly cookie.
- **The homepage** renders the 12 top-voted names, each with the project it was named for and the model that suggested it.

All database access happens on the server with the Supabase service role key. Row-level security allows public reads only, and only the service role can run `upvote()`.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the values:

   | Variable | Where to get it |
   | --- | --- |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
   | `ANTHROPIC_API_KEY` | console.anthropic.com |
   | `OPENAI_API_KEY` | platform.openai.com |
   | `GEMINI_API_KEY` | aistudio.google.com |

   Default models are `claude-opus-5-5`, `gpt-5.5` and `gemini-3.5-flash`. Override them with `ANTHROPIC_MODEL`, `OPENAI_MODEL` and `GEMINI_MODEL`.

3. Run it:

   ```bash
   npm install
   npm run dev
   ```

## Notes

- The Claude call turns on server-side refusal fallbacks (`fallbacks: "default"`), so a safety-classifier decline is retried on a fallback model instead of returning nothing.
- The cookie-based "one vote per project" limit is meant to keep things honest, not to stop abuse: clearing cookies lets someone vote again. Before a public launch, add rate limiting (for example, per IP) to `/api/generate` and `/api/vote`, because every generate request makes three paid LLM calls.
