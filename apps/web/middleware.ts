import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate on the edge. Real session verification happens in the server
 * component via requireSession() — this only redirects on the obvious case
 * of no session cookie at all, saving one round-trip to the DB for logged-out
 * visitors hitting an app route.
 *
 * Not a security boundary. Every protected page still calls requireSession().
 */
const APP_PREFIXES = ["/overview", "/ledger", "/owners", "/savings", "/report", "/connect", "/settings", "/workload", "/import"];

const SESSION_COOKIE_RE = /^tare\.session/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const gated = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!gated) return NextResponse.next();

  const hasSessionCookie = req.cookies.getAll().some((c) => SESSION_COOKIE_RE.test(c.name));
  if (hasSessionCookie) return NextResponse.next();

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/ledger/:path*",
    "/owners/:path*",
    "/savings/:path*",
    "/report/:path*",
    "/connect/:path*",
    "/settings/:path*",
    "/workload/:path*",
    "/import/:path*",
  ],
};
