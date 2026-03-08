import { NextResponse } from "next/server";
import { submitGuess } from "@/lib/cwogo/actions";
import { handleRouteError } from "@/lib/cwogo/http";
import { getAnyPlayerCookieToken } from "@/lib/cwogo/session";
import { submitGuessSchema } from "@/lib/cwogo/validations";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const { roundId } = await params;
    const playerSession = await getAnyPlayerCookieToken();

    if (!playerSession) {
      return NextResponse.json({ error: "Player session required." }, { status: 401 });
    }

    const payload = submitGuessSchema.parse(await request.json());
    const result = await submitGuess({
      roundId,
      playerToken: playerSession.token,
      guess: payload.guess,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
