"use client";

import { useRouter } from "next/navigation";
import { MODEL_LABELS } from "@/lib/models";
import type { TopName } from "@/lib/supabase";
import { VoteButton } from "./VoteButton";

export function Leaderboard({ names, votedProjects }: { names: TopName[]; votedProjects: string[] }) {
  const router = useRouter();

  if (names.length === 0) {
    return <p className="muted">No votes yet. Name something and pick a favorite.</p>;
  }

  return (
    <ol className="leaderboard">
      {names.map((n) => (
        <li key={n.id} className="name-row">
          <div>
            <span className="name">{n.name}</span>
            <span className="meta">
              {n.projects?.description} · by {MODEL_LABELS[n.model] ?? n.model}
            </span>
          </div>
          <VoteButton
            nameId={n.id}
            votes={n.votes}
            disabled={votedProjects.includes(n.project_id)}
            onVoted={() => router.refresh()}
          />
        </li>
      ))}
    </ol>
  );
}
