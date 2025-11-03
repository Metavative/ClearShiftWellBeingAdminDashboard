import { cookies } from "next/headers";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const COOKIE_NAME = "admin_session";

function getSecret() {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) throw new Error("Missing ADMIN_JWT_SECRET");
    return new TextEncoder().encode(secret);
}

export type AdminSession = {
    adminId: string;
    domain: string;
};

export async function createAdminSession(payload: AdminSession) {
    const token = await new SignJWT(payload as JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSecret());

    // set cookie (HttpOnly so client JS can’t read it)
    (await cookies()).set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return token;
}

export async function readAdminSession(): Promise<AdminSession | null> {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getSecret());
        const adminId = String(payload.adminId || "");
        const domain  = String(payload.domain || "");
        if (!adminId || !domain) return null;
        return { adminId, domain };
    } catch {
        return null;
    }
}

export async function destroyAdminSession() {
    (await cookies()).set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}
