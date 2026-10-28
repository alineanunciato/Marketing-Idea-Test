import { NextResponse } from "next/server";
import { suggestNames } from "@/lib/namers";
import { supabase, type NameRow } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const description =
    typeof body?.description === "string" ? body.description.replace(/\s+/g, " ").trim() : "";

  if (description.length < 3 || description.length > 140) {
    return NextResponse.json(
      { error: "Describe your project in one line (3–140 characters)." },
      { status: 400 },
    );
  }

  const results = await suggestNames(description);
  const rows = results.flatMap((r) => (r.ok ? r.names.map((name) => ({ name, model: r.model })) : []));
  if (rows.length === 0) {
    return NextResponse.json({ error: "None of the models could suggest names. Try again." }, { status: 502 });
  }

  const db = supabase();
  const { data: project, error: projectError } = await db
    .from("projects")
    .insert({ description })
    .select()
    .single();
  if (projectError) throw projectError;

  const { data: names, error: namesError } = await db
    .from("names")
    .insert(rows.map((row) => ({ ...row, project_id: project.id })))
    .select();
  if (namesError) throw namesError;

  const errors = results.flatMap((r) => (r.ok ? [] : [{ model: r.model, error: r.error }]));
  return NextResponse.json({ project, names: names as NameRow[], errors });
}
