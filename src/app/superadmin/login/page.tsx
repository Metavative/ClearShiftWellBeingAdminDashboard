"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();
    const next = "/admin-management";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            if (!res.ok) throw new Error((await res.json()).message || "Login failed");
            router.replace(next);
            router.refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Super Admin Login</h1>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Username</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                            placeholder="superadmin"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                        {loading ? "Signing in…" : "Sign In"}
                    </button>

                    <p className="mt-2 text-xs text-gray-500">
                        This area is for internal Super Admin only.
                    </p>
                </form>
            </div>
        </div>
    );
}
