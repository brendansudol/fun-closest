import { NextResponse } from "next/server";
import { readRoleAwareRoomState } from "@/lib/cwogo/actions";
import { handleRouteError } from "@/lib/cwogo/http";
import { getHostCookieToken, getPlayerCookieToken } from "@/lib/cwogo/session";

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
