import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passcode } = (await req.json()) as { passcode?: string };
  if (!passcode || passcode !== process.env.BETA_PASSCODE) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
