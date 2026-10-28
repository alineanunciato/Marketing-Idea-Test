"use client";

import { useState } from "react";

type Props = {
  nameId: string;
  votes: number;
  disabled?: boolean;
  picked?: boolean;
  onVoted?: (votes: number) => void;
};

export function VoteButton({ nameId, votes, disabled, picked, onVoted }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Vote failed.");
      onVoted?.(data.votes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={`vote${picked ? " picked" : ""}`}
      onClick={vote}
      disabled={disabled || pending}
      title={error ?? (picked ? "Your favorite" : disabled ? "You already voted on this project" : "Upvote")}
      aria-label={`Upvote (${votes} votes)`}
    >
      <span aria-hidden>▲</span>
      <span>{votes}</span>
    </button>
  );
}
