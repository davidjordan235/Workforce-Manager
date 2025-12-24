import { NextResponse } from "next/server";

// Disabled auth middleware for development with mock data
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
