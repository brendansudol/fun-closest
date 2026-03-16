import { NextResponse } from "next/server";
import { createRoom } from "@/lib/game/actions";
import { handleRouteError } from "@/lib/game/http";
import { getSessionCookieOptions } from "@/lib/game/session";
import { HOST_COOKIE_NAME } from "@/lib/game/constants";
import { createRoomSchema } from "@/lib/game/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = createRoomSchema.parse(await request.json());
    const result = await createRoom(payload);
    const response = NextResponse.json({
      roomSlug: result.room.slug,
      joinCode: result.room.joinCode,
      hostUrl: result.hostUrl,
    });

    response.cookies.set(HOST_COOKIE_NAME, `${result.room.slug}:${result.hostToken}`, getSessionCookieOptions());
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
