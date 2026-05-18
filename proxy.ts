import { NextRequest, NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");

  if (acceptsHtml && request.nextUrl.pathname.startsWith("/list/")) {
    const cacheControl = "public, s-maxage=1800, stale-while-revalidate=86400";
    response.headers.set("Cache-Control", cacheControl);
    response.headers.set("CDN-Cache-Control", cacheControl);
    response.headers.set("Cloudflare-CDN-Cache-Control", cacheControl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"]
};
