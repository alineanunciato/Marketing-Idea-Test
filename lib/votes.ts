import "server-only";
import { cookies } from "next/headers";

// Project ids this browser has already voted in: one favorite per project per visitor.
const COOKIE = "nmt_voted";
const MAX_REMEMBERED = 100; // ~3.7KB, under the 4KB cookie limit

export async function votedProjectIds(): Promise<string[]> {
  const jar = await cookies();
  return (jar.get(COOKIE)?.value ?? "").split(".").filter(Boolean);
}

export async function rememberVote(projectId: string) {
  const voted = await votedProjectIds();
  const jar = await cookies();
  jar.set(COOKIE, [...voted, projectId].slice(-MAX_REMEMBERED).join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
