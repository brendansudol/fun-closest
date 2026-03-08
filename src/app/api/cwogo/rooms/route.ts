import { NextResponse } from "next/server";
import { createRoom } from "@/lib/cwogo/actions";
import { handleRouteError } from "@/lib/cwogo/http";
import { getSessionCookieOptions } from "@/lib/cwogo/session";
import { HOST_COOKIE_NAME } from "@/lib/cwogo/constants";
import { createRoomSchema } from "@/lib/cwogo/validations";

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
