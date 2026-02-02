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
        isPositive?: boolean;
    }[];
    submittedAt: string;
};

// Detect if a question is positive or negative based on question text
const detectQuestionSentiment = (questionText: string): boolean => {
    const text = questionText.toLowerCase();
    
    // Positive question indicators (feeling good/supported is the desired state)
    const positiveIndicators = [
        'supported', 'respected', 'listened', 'valued', 'appreciated',
        'comfortable', 'satisfied', 'happy', 'motivated', 'engaged',
        'confident', 'empowered', 'recognized', 'fulfilled', 'safe',
        'balanced', 'positive', 'good', 'well', 'energized'
    ];
    
    // Negative question indicators (feeling bad/stressed is being asked about)
    const negativeIndicators = [
        'pressure', 'stress', 'overwhelmed', 'anxious', 'worried',
        'uncomfortable', 'discomfort', 'difficulty', 'problem', 'issue',
        'conflict', 'tension', 'exhausted', 'burned out', 'frustrated',
        'isolated', 'discriminated', 'harassed', 'bullied', 'affect'
    ];
    
    // Check for negative indicators first (more specific)
    for (const indicator of negativeIndicators) {
        if (text.includes(indicator)) return false;
    }
    
    // Check for positive indicators
    for (const indicator of positiveIndicators) {
        if (text.includes(indicator)) return true;
    }
    
    // Default to positive if uncertain
    return true;
};

// RAG (Red, Amber, Green) color function for check-in responses
const optionColor = (option: string, isPositive?: boolean, questionText?: string): string => {
    const text = String(option).toLowerCase().trim();
    
    // If isPositive is not provided, infer from question text
    const questionIsPositive = isPositive ?? (questionText ? detectQuestionSentiment(questionText) : true);
    
    // IMPORTANT: Check "prefer not" BEFORE "no" to prevent false matches
    // Neutral/Prefer not to say: Always Amber
    if (
        text.includes('neutral') ||
        text.includes('prefer not') ||
        text.includes('n/a') ||
        text.includes('not applicable')
    ) return '#f9a825';
    
    // Other: Amber (similar to prefer not to say)
    if (text.includes('other')) return '#f9a825';
    
    // Negative intensity words - Red for negative impact
    if (
        text.includes('heavy') ||
        text.includes('severe') ||
        text.includes('major') ||
        text.includes('significant') ||
        text.includes('high') ||
        text.includes('very much') ||
        text.includes('strongly') ||
        text.includes('extremely')
    ) return '#c62828';
    
    // Positive intensity words - Green for positive impact
    if (
        text.includes('light') ||
        text.includes('minor') ||
        text.includes('slight') ||
        text.includes('low') ||
        text.includes('minimal') ||
        text.includes('not much')
    ) return '#43a047';
    
    // Medium/moderate - Amber
    if (
        text.includes('medium') ||
        text.includes('moderate') ||
        text.includes('some') ||
        text.includes('somewhat') ||
        text.includes('mixed') ||
        text.includes('average')
    ) return '#f9a825';
    
    // Yes answers: Green for positive questions, Red for negative questions
    if (text.includes('yes')) return questionIsPositive ? '#43a047' : '#c62828';
    
    // No answers: Red for positive questions, Green for negative questions
    // Use word boundary to avoid matching "not", "minor", etc.
    if (text === 'no' || text.startsWith('no ') || text.endsWith(' no')) {
        return questionIsPositive ? '#c62828' : '#43a047';
    }
    
    // Default: Blue-grey for unknown options
    return '#607d8b';
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
                                                <div className="flex items-center gap-2">
                                                    {/* RAG Color Dot */}
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{
                                                            backgroundColor: optionColor(answer.option, answer.isPositive, answer.question),
                                                        }}
                                                        title={`Question sentiment: ${detectQuestionSentiment(answer.question) ? 'Positive' : 'Negative'}`}
                                                    />
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Answer: <span className="font-semibold">{answer.option}</span>
                                                    </p>
                                                </div>
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
