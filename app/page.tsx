import { Generator } from "./components/Generator";
import { Leaderboard } from "./components/Leaderboard";
import { getTopNames } from "@/lib/supabase";
import { votedProjectIds } from "@/lib/votes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [topNames, votedProjects] = await Promise.all([getTopNames(), votedProjectIds()]);

  return (
    <main>
      <header>
        <h1>Name My Thing</h1>
        <p className="muted">
          Describe your project in one line. Claude, OpenAI and Gemini each suggest three names. Upvote your favorite.
        </p>
      </header>

      <Generator />

      <section>
        <h2>Top-voted names</h2>
        <Leaderboard names={topNames} votedProjects={votedProjects} />
      </section>
    </main>
  );
}
