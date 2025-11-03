export const runtime = "nodejs";


import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminTokenNode } from "@/lib/adminAuthNode";

export async function GET(req: NextRequest) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const { ok, payload } = verifyAdminTokenNode(token);
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, admin: { domain: payload!.dom, exp: payload!.exp } });
}
