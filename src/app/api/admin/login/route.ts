import { NextResponse } from "next/server";
import axios from "axios";
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken } from "@/lib/adminAuthNode";

export const runtime = "nodejs";

const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? ""; // prefer server-only var

export async function POST(req: Request) {
    try {
        // 1) Parse JSON body safely
        const body = await req.json();           // will throw if not JSON
        const { domain, licenseKey } = body || {};
        if (!domain || !licenseKey) {
            return NextResponse.json(
                { ok: false, message: "Domain and license key are required." },
                { status: 400 }
            );
        }

        // 2) Call your API correctly (Axios GET with query params)
        if (!API_BASE) {
            return NextResponse.json(
                { ok: false, message: "API_BASE is not configured on the server." },
                { status: 500 }
            );
        }

        const { data } = await axios.get(`${API_BASE}/admins`, {
            params: { domain, limit: 1 },
            // headers: { Authorization: `Bearer ${...}` } // if needed
            validateStatus: () => true, // let us handle non-2xx
        });

        // 3) Validate the shape of the response
        if (!data) {
            return NextResponse.json(
                { ok: false, message: "Empty response from admin service." },
                { status: 502 }
            );
        }
        if (data.ok === false) {
            return NextResponse.json(
                { ok: false, message: data.message || "Lookup failed." },
                { status: 400 }
            );
        }

        // support either {items:[...]} or a raw array
        const items = Array.isArray(data) ? data : data.items;
        const admin = items?.[0];
        if (!admin) {
            return NextResponse.json(
                { ok: false, message: "No admin found for this domain." },
                { status: 401 }
            );
        }

        // 4) License checks
        if (admin.licenseStatus !== "active") {
            return NextResponse.json(
                { ok: false, message: "License not active." },
                { status: 401 }
            );
        }
        if (admin.expiresAt && new Date(admin.expiresAt).getTime() <= Date.now()) {
            return NextResponse.json(
                { ok: false, message: "License expired." },
                { status: 401 }
            );
        }
        if (admin.licenseKey !== licenseKey) {
            return NextResponse.json(
                { ok: false, message: "Invalid license key." },
                { status: 401 }
            );
        }

        // 5) Issue cookie
        const token = createAdminToken(admin.domain, admin.licenseKey);
        const res = NextResponse.json({
            ok: true,
            admin: {
                domain: admin.domain,
                name: `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim(),
                email: admin.email,
            },
        });
        res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions);
        return res;
    } catch (err: unknown) {
        // If the error came from req.json(), it’s almost always “Unexpected end of JSON input”
        const message = err instanceof Error ? err.message : undefined;
        return NextResponse.json(
            { ok: false, message: "Invalid JSON body.", error: message },
            { status: 400 }
        );
    }
}
