import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("refresh_token")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true }, { status: 200 });
}
