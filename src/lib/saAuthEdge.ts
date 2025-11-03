// Edge runtime uses Web Crypto (crypto.subtle) — no Node 'crypto'
const encoder = new TextEncoder();

const b64url = {
    encode: (buf: ArrayBuffer | Uint8Array) =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    decodeStr: (str: string) => {
        const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
        const bin = atob(b64);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }
};

const SECRET = process.env.SUPERADMIN_SECRET || "dev-secret";

async function hmacSha256(data: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return b64url.encode(sig);
}

type Payload = { sub: "superadmin"; iat: number; exp: number; v: 1 };

export async function verifySaTokenEdge(token?: string): Promise<{ ok: boolean; payload?: Payload }> {
    try {
        if (!token) return { ok: false };
        const parts = token.split(".");
        if (parts.length !== 3) return { ok: false };
        const [header, payload, signature] = parts;
        const expected = await hmacSha256(`${header}.${payload}`);
        if (signature !== expected) return { ok: false };
        const json = JSON.parse(b64url.decodeStr(payload)) as Payload;
        if (json.sub !== "superadmin") return { ok: false };
        if (json.exp <= Math.floor(Date.now() / 1000)) return { ok: false };
        return { ok: true, payload: json };
    } catch {
        return { ok: false };
    }
}

// keep cookie name consistent
export const SA_COOKIE = "sa_session";
