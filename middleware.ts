import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPages = ["/dashboard", "/settings", "/character", "/admin"];
const protectedApiRoutes = ["/api/chat", "/api/models", "/api/test-key", "/api/cloud", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = protectedPages.some((path) => pathname.startsWith(path));
  const isProtectedApi = protectedApiRoutes.some((path) => pathname.startsWith(path));

  const { response, user, supabase } = await updateSession(request);

  if (!isProtectedPage && !isProtectedApi) {
    return response;
  }

  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

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

  if (!profile || profile.disabled_at || profile.deleted_at) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings", "/character/:path*", "/admin/:path*", "/api/:path*"]
};
