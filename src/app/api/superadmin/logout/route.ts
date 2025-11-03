export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { SA_COOKIE, cookieOptions } from "@/lib/saAuthNode";

export async function POST() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SA_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return res;
}
