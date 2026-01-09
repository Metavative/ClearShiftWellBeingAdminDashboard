"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

function AdminLoginContent() {
    const router = useRouter();
    const next = useSearchParams().get("next") || "/admin/dashboard";
    const [domain, setDomain] = useState("");
    const [licenseKey, setLicenseKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault(); setErr(null); setLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain: domain.trim().toLowerCase(), licenseKey: licenseKey.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Login failed");
            router.replace(next); router.refresh();
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Login failed"); }
        finally { setLoading(false); }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Admin Login</h1>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">Domain</label>
                        <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                            value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="metavative.com" autoFocus />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">License Key</label>
                        <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                            value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="csw-lic-ABCD-1234-..." />
                    </div>
                    {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
                    <button type="submit" disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400">
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">Use your assigned domain and license key. Contact Super Admin for help.</p>
                </form>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={null}>
            <AdminLoginContent />
        </Suspense>
    );
}
