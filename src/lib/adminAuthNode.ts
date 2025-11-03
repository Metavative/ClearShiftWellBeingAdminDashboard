import "server-only";
import crypto from "crypto";

const b64url = {
    encode: (buf: Buffer | string) => {
        if (typeof buf === "string") {
            buf = Buffer.from(buf, "utf8");
        }
        return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    decode: (str: string) =>
        Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4), "base64"),
};

const SECRET = process.env.ADMIN_SECRET || "dev-admin-secret";
const DAYS   = Number(process.env.ADMIN_SESSION_DAYS || 7);

export type AdminPayload = { sub: "admin"; dom: string; lic: string; iat: number; exp: number; v: 1 };

export function createAdminToken(domain: string, licenseKey: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + DAYS * 24 * 60 * 60;
    const licHint = crypto.createHash("sha256").update(licenseKey).digest("hex").slice(0, 12);
    const header  = b64url.encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = b64url.encode(JSON.stringify({ sub: "admin", dom: domain, lic: licHint, iat, exp, v: 1 } as AdminPayload));
    const data = `${header}.${payload}`;
    const sig  = crypto.createHmac("sha256", SECRET).update(data).digest();
    const signature = b64url.encode(sig);
    return `${data}.${signature}`;
}

export function verifyAdminTokenNode(token?: string): { ok: boolean; payload?: AdminPayload } {
    if (!token) return { ok: false };
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false };
    const [header, payload, signature] = parts;
    const sig = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest();
    const expected = b64url.encode(sig);
    if (signature !== expected) return { ok: false };
    try {
        const json = JSON.parse(b64url.decode(payload).toString()) as AdminPayload;
        if (json.sub !== "admin") return { ok: false };
        if (json.exp <= Math.floor(Date.now() / 1000)) return { ok: false };
        return { ok: true, payload: json };
    } catch {
        return { ok: false };
    }
}

export const ADMIN_COOKIE = "admin_session";
export const adminCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
};
