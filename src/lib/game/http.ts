import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { GameError } from "./errors";

export function handleRouteError(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
