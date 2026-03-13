import { NextResponse } from "next/server";
import postgres from "postgres";
import { ZodError } from "zod";
import { CwogoError } from "./errors";

const DATABASE_QUOTA_ERROR =
  "The configured Postgres project has exceeded its data transfer quota. Update DATABASE_URL, wait for the provider quota reset, or upgrade that database plan.";

export function handleRouteError(error: unknown) {
  if (error instanceof CwogoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  if (error instanceof postgres.PostgresError) {
    const message = error.message.toLowerCase().includes("data transfer quota")
      ? DATABASE_QUOTA_ERROR
      : "Database request failed.";

    return NextResponse.json({ error: message }, { status: 503 });
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
