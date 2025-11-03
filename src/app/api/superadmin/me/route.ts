export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { SA_COOKIE, verifySaTokenNode } from "@/lib/saAuthNode";

export async function GET(req: NextRequest) {
    const token = req.cookies.get(SA_COOKIE)?.value;
    const { ok, payload } = verifySaTokenNode(token);
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, user: { role: "superadmin", iat: payload!.iat, exp: payload!.exp } });
}
