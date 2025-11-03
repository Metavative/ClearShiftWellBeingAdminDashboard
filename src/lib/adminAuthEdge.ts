const encoder = new TextEncoder();
const b64url = {
    encode: (buf: ArrayBuffer | Uint8Array) =>
        btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    decodeStr: (str: string) => {
        const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
        const bin = atob(b64); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }
};
const SECRET = process.env.ADMIN_SECRET || "dev-admin-secret";

async function hmacSha256(data: string) {
    const key = await crypto.subtle.importKey("raw", encoder.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return b64url.encode(sig);
}

export type AdminPayload = { sub: "admin"; dom: string; lic: string; iat: number; exp: number; v: 1 };

export async function verifyAdminTokenEdge(token?: string): Promise<{ ok: boolean; payload?: AdminPayload }> {
    try {
        if (!token) return { ok: false };
        const [h, p, s] = token.split(".");
        if (!h || !p || !s) return { ok: false };
        const expected = await hmacSha256(`${h}.${p}`);
        if (s !== expected) return { ok: false };
        const json = JSON.parse(b64url.decodeStr(p)) as AdminPayload;
        if (json.sub !== "admin" || json.exp <= Math.floor(Date.now()/1000)) return { ok: false };
        return { ok: true, payload: json };
    } catch { return { ok: false }; }
}

export const ADMIN_COOKIE = "admin_session";
