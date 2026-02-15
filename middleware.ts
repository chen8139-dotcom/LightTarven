import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPages = ["/dashboard", "/settings", "/character", "/admin"];

export async function middleware(request: NextRequest) {
  const startedAt = Date.now();
  const { pathname } = request.nextUrl;
  const isProtectedPage = protectedPages.some((path) => pathname.startsWith(path));

  const sessionStartedAt = Date.now();
  const { response, user, supabase } = await updateSession(request);
  const sessionMs = Date.now() - sessionStartedAt;

  if (!isProtectedPage) {
    return response;
  }

  if (!user) {
    console.info(
      `[perf][middleware] path=${pathname} auth=unauthorized sessionMs=${sessionMs} totalMs=${Date.now() - startedAt}`
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  const profileStartedAt = Date.now();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,disabled_at,deleted_at")
    .eq("id", user.id)
    .single<{
      id: string;
      role: "admin" | "user";
      disabled_at: string | null;
      deleted_at: string | null;
    }>();
  const profileMs = Date.now() - profileStartedAt;

  if (!profile || profile.disabled_at || profile.deleted_at) {
    console.info(
      `[perf][middleware] path=${pathname} auth=inactive sessionMs=${sessionMs} profileMs=${profileMs} totalMs=${Date.now() - startedAt}`
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    console.info(
      `[perf][middleware] path=${pathname} auth=forbidden sessionMs=${sessionMs} profileMs=${profileMs} totalMs=${Date.now() - startedAt}`
    );
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  console.info(
    `[perf][middleware] path=${pathname} auth=ok sessionMs=${sessionMs} profileMs=${profileMs} totalMs=${Date.now() - startedAt}`
  );

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings", "/character/:path*", "/admin/:path*"]
};
