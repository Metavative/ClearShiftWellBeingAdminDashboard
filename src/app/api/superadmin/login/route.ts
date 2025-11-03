export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { SA_COOKIE, cookieOptions, createSaToken } from "@/lib/saAuthNode";

export async function POST(req: Request) {
    const { username, password } = await req.json().catch(() => ({}));
    const u = process.env.SUPERADMIN_USERNAME || "superadmin";
    const p = process.env.SUPERADMIN_PASSWORD || "password";

    if (username !== u || password !== p) {
        return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
    }

    const token = createSaToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SA_COOKIE, token, cookieOptions);
    return res;
}
