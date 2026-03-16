import { NextResponse } from "next/server";
import { readRoleAwareRoomState } from "@/lib/game/actions";
import { handleRouteError } from "@/lib/game/http";
import { getHostCookieToken, getPlayerCookieToken } from "@/lib/game/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const state = await readRoleAwareRoomState({
      slug,
      hostToken: await getHostCookieToken(slug),
      playerToken: await getPlayerCookieToken(slug),
    });

    return NextResponse.json(state);
  } catch (error) {
    return handleRouteError(error);
  }
}
