import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { HOST_COOKIE_NAME, PLAYER_COOKIE_NAME } from "./constants";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildCookieValue(slug: string, token: string) {
  return `${slug}:${token}`;
}

function parseCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [slug, token] = value.split(":");

  if (!slug || !token) {
    return null;
  }

  return { slug, token };
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function getSessionCookieOptions() {
  return baseCookieOptions();
}

export function createOpaqueToken() {
  return randomBytes(24).toString("hex");
}

export function hashOpaqueToken(token: string) {
  return hashToken(token);
}

export async function getHostCookieToken(slug: string) {
  const cookieStore = await cookies();
  const parsed = parseCookieValue(cookieStore.get(HOST_COOKIE_NAME)?.value);

  if (!parsed || parsed.slug !== slug) {
    return null;
  }

  return parsed.token;
}

export async function getPlayerCookieToken(slug: string) {
  const cookieStore = await cookies();
  const parsed = parseCookieValue(cookieStore.get(PLAYER_COOKIE_NAME)?.value);

  if (!parsed || parsed.slug !== slug) {
    return null;
  }

  return parsed.token;
}

export async function getAnyPlayerCookieToken() {
  const cookieStore = await cookies();
  const parsed = parseCookieValue(cookieStore.get(PLAYER_COOKIE_NAME)?.value);

  return parsed ?? null;
}

export function setHostSessionCookie(response: Response, slug: string, token: string) {
  response.headers.append(
    "set-cookie",
    `${HOST_COOKIE_NAME}=${buildCookieValue(slug, token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

export function setPlayerSessionCookie(response: Response, slug: string, token: string) {
  response.headers.append(
    "set-cookie",
    `${PLAYER_COOKIE_NAME}=${buildCookieValue(slug, token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

export async function writeHostSessionCookie(slug: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE_NAME, buildCookieValue(slug, token), baseCookieOptions());
}

export async function writePlayerSessionCookie(slug: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PLAYER_COOKIE_NAME, buildCookieValue(slug, token), baseCookieOptions());
}
