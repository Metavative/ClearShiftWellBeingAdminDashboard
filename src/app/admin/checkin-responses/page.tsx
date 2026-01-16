"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type CheckInResponse = {
    _id: string;
    employeeId: string;
    domain: string;
    answers: {
        questionId: string;
        question: string;
        option: string;
        description: string;
    }[];
    submittedAt: string;
};

export default function CheckInResponsesPage() {
    const [domain, setDomain] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<CheckInResponse[]>([]);
    const [employeeFilter, setEmployeeFilter] = useState<string>("");

    // Get admin domain from session
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
                setErr(e instanceof Error ? e.message : "Unable to load session.");
                setLoading(false);
            }
        })();
    }, []);

    // Load responses when domain is available
    useEffect(() => {
        if (!domain) return;
        fetchResponses();
    }, [domain, employeeFilter]);

    async function fetchResponses() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ domain });
            if (employeeFilter.trim()) {
                params.append("employeeId", employeeFilter.trim());
            }

            const res = await fetch(`${API_BASE}/checkin-responses?${params}`, {
                cache: "no-store",
            });

            if (!res.ok) {
                if (res.status === 404) {
                    setItems([]);
                    setErr(null);
                    return;
                }
                throw new Error(await res.text());
            }

            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
            setErr(null);
        } catch (e: unknown) {
            console.error(e);
            setErr(e instanceof Error ? e.message : "Failed to load responses.");
        } finally {
            setLoading(false);
        }
    }

    if (loading && !domain) return <div className="p-4">Loading...</div>;
    if (err) return <div className="p-4 text-red-600">{err}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Check-in Responses</h1>
                <p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain}</span></p>
            </div>

            {/* Filter Section */}
            <div className="bg-white dark:bg-white/[0.03] rounded-xl border p-4">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Filter by Employee ID
                        </label>
                        <input
                            type="text"
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            placeholder="Enter employee ID (optional)"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={fetchResponses}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Responses List */}
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03]">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-gray-800 dark:text-white">
                        Submitted Responses ({items.length})
                    </h2>
                </div>

                <div className="divide-y">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading responses...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No responses found for this domain.
                        </div>
                    ) : (
                        items.map((response) => (
                            <div
                                key={response._id}
                                className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                Employee ID: {response.employeeId}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(response.submittedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Answers */}
                                <div className="space-y-3 ml-4">
                                    {response.answers && response.answers.length > 0 ? (
                                        response.answers.map((answer, idx) => (
                                            <div key={idx} className="border-l-2 border-indigo-200 pl-4">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {answer.question}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Answer: <span className="font-semibold">{answer.option}</span>
                                                </p>
                                                {answer.description && (
                                                    <p className="text-xs text-gray-500 mt-1 italic">
                                                        Note: {answer.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No answers recorded</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
