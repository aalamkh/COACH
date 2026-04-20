import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "coach_auth";
const EXPECTED = "ok";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === EXPECTED) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

// Run on every route except static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
