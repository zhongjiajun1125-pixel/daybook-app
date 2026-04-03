import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr/dist/module/types";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";

const AUTH_ROUTE = "/auth";
const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next")
    || pathname.startsWith("/favicon")
    || pathname.startsWith("/api")
    || PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && pathname !== AUTH_ROUTE) {
    return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
  }

  if (user && pathname === AUTH_ROUTE) {
    return NextResponse.redirect(new URL("/capture", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
