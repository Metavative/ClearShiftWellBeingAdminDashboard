// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { SA_COOKIE, verifySaTokenEdge } from "@/lib/saAuthEdge";
import { ADMIN_COOKIE, verifyAdminTokenEdge } from "@/lib/adminAuthEdge";

const PUBLIC = [
    "/superadmin/login", "/api/superadmin/login", "/api/superadmin/logout",
    "/admin/login", "/api/admin/login", "/api/admin/logout", "/api/admin/me",
    "/favicon.ico",
];

const isPublic = (p: string) =>
    PUBLIC.some(x => p.startsWith(x)) || p.startsWith("/_next") || p.startsWith("/public");

// ✅ Only treat the TENANT area as `/admin` root or its subpaths.
//    This will NOT match "/admin-management" anymore.
const isTenantAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/");

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isPublic(pathname)) return NextResponse.next();

    if (isTenantAdminPath(pathname)) {
        const tok = req.cookies.get(ADMIN_COOKIE)?.value;
        const { ok } = await verifyAdminTokenEdge(tok);
        if (!ok) {
            const url = req.nextUrl.clone();
            url.pathname = "/admin/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // Everything else is Super Admin space (including /admin-management)
    const sa = req.cookies.get(SA_COOKIE)?.value;
    const { ok } = await verifySaTokenEdge(sa);
    if (!ok) {
        const url = req.nextUrl.clone();
        url.pathname = "/superadmin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next|public|favicon.ico|superadmin/login|api/superadmin/login|api/superadmin/logout|admin/login|api/admin/login|api/admin/logout).*)",
    ],
};
