import { NextResponse } from "next/server";
import { startRound } from "@/lib/game/actions";
import { handleRouteError } from "@/lib/game/http";
import { getHostCookieToken } from "@/lib/game/session";
import { startRoundSchema } from "@/lib/game/validations";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const hostToken = await getHostCookieToken(slug);

    if (!hostToken) {
      return NextResponse.json({ error: "Host session required." }, { status: 401 });
    }

    const payload = startRoundSchema.parse(await request.json());
    const result = await startRound({
      slug,
      hostToken,
      pack: payload.pack,
      roundSeconds: payload.roundSeconds,
      maxRounds: payload.maxRounds,
      promptId: payload.promptId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
