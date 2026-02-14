import { NextRequest, NextResponse } from "next/server";

const protectedPages = ["/dashboard", "/settings", "/character"];
const apiRoutes = ["/api/chat", "/api/test-key"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedPage = protectedPages.some((path) => pathname.startsWith(path));
  const isProtectedApi = apiRoutes.some((path) => pathname.startsWith(path));

  if (isProtectedPage) {
    const cookie = req.cookies.get("lt_access")?.value;
    if (cookie !== "1") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isProtectedApi) {
    const passcode = req.headers.get("x-light-passcode");
    if (!passcode || passcode !== process.env.BETA_PASSCODE) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings", "/character/:path*", "/api/chat", "/api/test-key"]
};
