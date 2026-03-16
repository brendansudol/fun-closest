import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/game/http";
import { revealRound } from "@/lib/game/actions";
import { getHostCookieToken } from "@/lib/game/session";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const hostToken = await getHostCookieToken(slug);

    if (!hostToken) {
      return NextResponse.json({ error: "Host session required." }, { status: 401 });
    }

    const result = await revealRound({ slug, hostToken });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
