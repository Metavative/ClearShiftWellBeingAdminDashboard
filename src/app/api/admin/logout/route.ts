export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/adminAuthNode";

export async function POST() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
    return res;
}
