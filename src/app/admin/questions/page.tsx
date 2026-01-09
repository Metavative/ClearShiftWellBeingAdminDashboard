"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type Question = {
    _id: string;
    domain: string;
    question: string;
    options: string[];
    isSupport?: boolean;
    isActive?: boolean;
};

export default function AdminQuestionsPage() {
    const [domain, setDomain] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [items, setItems] = useState<Question[]>([]);
    const [qText, setQText] = useState("");
    const [optInput, setOptInput] = useState("Yes,No,Prefer not to say,Other");
    const [isPositive, setIsPositive] = useState<boolean>(false);
    const options = useMemo(
        () => optInput.split(",").map((s) => s.trim()).filter(Boolean),
        [optInput]
    );

    // 1) Get admin domain from session
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/me", { cache: "no-store" });
                const data = await res.json();
                if (!res.ok || !data?.ok) {
                    setErr("Session expired. Please log in again.");
                    setLoading(false);
                    return;
                }
                setDomain(data.admin.domain);

            } catch (e: unknown) {
                console.log("Working", e);
                setErr(e instanceof Error ? e.message : "Unable to load session.");
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        console.log("Domain Name >> ", domain);
    }, [domain]);

    // 2) Load questions for this domain
    useEffect(() => {
        if (!domain) return;
        console.log(domain);
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/checkin?domain=${encodeURIComponent(domain)}`, {
                    cache: "no-store",
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setItems(Array.isArray(data) ? data : data.items || []);
                setErr(null);
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : "Failed to load questions.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [domain]);

    async function createQuestion() {
        if (!qText.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain,
                    question: qText.trim(),
                    options,
                    isActive: true,
                    isPositive
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            setQText("");
            await reload();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Create failed";
            alert(msg);
        }
    }

    async function removeQuestion(id: string) {
        if (!confirm("Delete this question?")) return;
        try {
            const res = await fetch(`${API_BASE}/checkin/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain }),
            });

            if (!res.ok) throw new Error(await res.text());
            await reload();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            alert(msg);
        }
    }

    async function reload() {
        if (!domain) return;
        const res = await fetch(`${API_BASE}/checkin?domain=${encodeURIComponent(domain)}`, { cache: "no-store" });
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.items || []);
    }

    if (loading) return <div>Loading…</div>;
    if (err) return <div className="text-red-600">{err}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Check-In Questions</h1>
                <p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain}</span></p>
            </div>

            {/* Create */}
            <div className="rounded-xl border p-4 bg-white dark:bg-white/[0.03]">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-xs text-gray-500">Question</label>
                        <input
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            placeholder='e.g., "Is your team lead supportive?"'
                            className="mt-1 h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Options (comma-separated)</label>
                        <input
                            value={optInput}
                            onChange={(e) => setOptInput(e.target.value)}
                            className="mt-1 h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                        />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isPositive}
                            onChange={(e) => setIsPositive(e.target.checked)}
                            id="isPositive"
                        />
                        <label htmlFor={"isPositive"} className="text-sm text-gray-700">Positive Question</label>
                    </div>

                </div>
                <div className="mt-3">
                    <button
                        onClick={createQuestion}
                        className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
                    >
                        Add Question
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03]">
                <div className="divide-y">
                    {items.length === 0 && <div className="p-4 text-gray-500">No questions yet.</div>}
                    {items.map((q) => (
                        <div key={q._id} className="p-4 flex items-start justify-between gap-4">
                            <div>
                                <div className="font-medium">{q.question}</div>
                                <div className="mt-1 text-xs text-gray-500">Options: {q.options.join(", ")}</div>
                            </div>
                            <button
                                onClick={() => removeQuestion(q._id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
