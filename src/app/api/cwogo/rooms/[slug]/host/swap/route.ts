import { NextResponse } from "next/server";
import { swapRoundPrompt } from "@/lib/cwogo/actions";
import { handleRouteError } from "@/lib/cwogo/http";
import { getHostCookieToken } from "@/lib/cwogo/session";

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

    const result = await swapRoundPrompt({ slug, hostToken });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
