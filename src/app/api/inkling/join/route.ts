import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/game/actions";
import { PLAYER_COOKIE_NAME } from "@/lib/game/constants";
import { handleRouteError } from "@/lib/game/http";
import { getSessionCookieOptions, getAnyPlayerCookieToken } from "@/lib/game/session";
import { joinRoomSchema } from "@/lib/game/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = joinRoomSchema.parse(await request.json());
    const existingSession = await getAnyPlayerCookieToken();
    const result = await joinRoom({
      joinCode: payload.joinCode,
      displayName: payload.displayName,
      existingToken: existingSession?.token ?? null,
    });
    const response = NextResponse.json({
      roomSlug: result.room.slug,
      playerUrl: result.playerUrl,
    });

    response.cookies.set(PLAYER_COOKIE_NAME, `${result.room.slug}:${result.playerToken}`, getSessionCookieOptions());
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
