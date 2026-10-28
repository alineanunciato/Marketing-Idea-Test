import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rememberVote, votedProjectIds } from "@/lib/votes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nameId = body?.nameId;
  if (typeof nameId !== "string" || !UUID.test(nameId)) {
    return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  }

  const db = supabase();
  const { data: name, error } = await db
    .from("names")
    .select("project_id")
    .eq("id", nameId)
    .maybeSingle();
  if (error) throw error;
  if (!name) return NextResponse.json({ error: "Name not found." }, { status: 404 });

  if ((await votedProjectIds()).includes(name.project_id)) {
    return NextResponse.json(
      { error: "You already picked a favorite for this project." },
      { status: 409 },
    );
  }

  const { data: votes, error: voteError } = await db.rpc("upvote", { name_id: nameId });
  if (voteError) throw voteError;
  await rememberVote(name.project_id);

  return NextResponse.json({ votes: votes as number });
}
