"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODELS, MODEL_LABELS } from "@/lib/models";
import { VoteButton } from "./VoteButton";

type Name = { id: string; name: string; model: string; votes: number };
type Result = {
  project: { id: string; description: string };
  names: Name[];
  errors: { model: string; error: string }[];
};

export function Generator() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setPickedId(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function voted(nameId: string, votes: number) {
    setPickedId(nameId);
    setResult((r) => r && { ...r, names: r.names.map((n) => (n.id === nameId ? { ...n, votes } : n)) });
    router.refresh(); // update the leaderboard
  }

  return (
    <section>
      <form className="generator" onSubmit={generate}>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A habit tracker for people who hate habit trackers"
          maxLength={140}
          minLength={3}
          required
          aria-label="Describe your project in one line"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Name it"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading && <p className="muted">Asking Claude, OpenAI and Gemini…</p>}

      {result && (
        <>
          <p className="muted">
            Pick your favorite for <strong>“{result.project.description}”</strong>
          </p>
          <div className="columns">
            {MODELS.map((model) => {
              const names = result.names.filter((n) => n.model === model);
              const failed = result.errors.find((e) => e.model === model);
              return (
                <div className="column" key={model}>
                  <h3>{MODEL_LABELS[model]}</h3>
                  {failed && <p className="muted">{failed.error}</p>}
                  <ul>
                    {names.map((n) => (
                      <li key={n.id} className="name-row">
                        <span className="name">{n.name}</span>
                        <VoteButton
                          nameId={n.id}
                          votes={n.votes}
                          picked={pickedId === n.id}
                          disabled={pickedId !== null}
                          onVoted={(votes) => voted(n.id, votes)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
