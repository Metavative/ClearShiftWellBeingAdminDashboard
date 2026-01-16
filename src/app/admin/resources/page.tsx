"use client";

import React, { useEffect, useState } from "react";


// Use the same API base as privacy policy page
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type SupportToolContent = {
    _id: string;
    tips: string[];
    eap: string[];
    hr: string[];
    crisis: string[];
    version: number;
    isActive: boolean;
    domain?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

type CreateEditModal = {
    isOpen: boolean;
    mode: "create" | "edit";
    selectedId?: string;
    tips: string[];
    eap: string[];
    hr: string[];
    crisis: string[];
    domain: string;
};

export default function AdminResourcesPage() {
    const [domain, setDomain] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [items, setItems] = useState<SupportToolContent[]>([]);
    const [modal, setModal] = useState<CreateEditModal>({
        isOpen: false,
        mode: "create",
        tips: [],
        eap: [],
        hr: [],
        crisis: [],
        domain: "",
    });

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
                setErr(e instanceof Error ? e.message : "Unable to load session.");
                setLoading(false);
            }
        })();
    }, []);

    // 2) Load resources
    useEffect(() => {
        if (!domain) return;
        fetchResources();
    }, [domain]);

    async function fetchResources() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/content/support-tools/all`, {
                cache: "no-store",
            });
            if (!res.ok) {
                // If 404/error, maybe no items yet or wrong endpoint, but we try.
                // Assuming standard error handling
                if (res.status === 404) {
                    setItems([]);
                    setErr(null);
                    return;
                }
                throw new Error(await res.text());
            }
            const data = await res.json();
            console.log("Fetched resources data: ", data);
            // Adapt to response structure. Privacy Policy had data.data or data.data.items
            setItems(Array.isArray(data.data) ? data.data : data.data?.items || []);
            setErr(null);
        } catch (e: unknown) {
            console.error(e);
            setErr(e instanceof Error ? e.message : "Failed to load resources.");
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setModal({
            isOpen: true,
            mode: "create",
            tips: [""],
            eap: [""],
            hr: [""],
            crisis: [""],
            domain: domain, // Pre-fill with session domain
        });
    }

    function openEditModal(item: SupportToolContent) {
        setModal({
            isOpen: true,
            mode: "edit",
            selectedId: item._id,
            tips: [...item.tips],
            eap: [...item.eap],
            hr: [...item.hr],
            crisis: [...item.crisis],
            domain: item.domain || domain,
        });
    }

    function closeModal() {
        setModal({
            isOpen: false,
            mode: "create",
            tips: [],
            eap: [],
            hr: [],
            crisis: [],
            domain: "",
        });
    }

    // Helper to manage list changes
    function updateListInternal(
        field: "tips" | "eap" | "hr" | "crisis",
        newVal: string[]
    ) {
        setModal((prev) => ({ ...prev, [field]: newVal }));
    }

    async function saveResource() {
        // Basic validation: ensure at least one item in each? Or just let them be empty?
        // Let's filter out empty strings
        const tips = modal.tips.map(s => s.trim()).filter(Boolean);
        const eap = modal.eap.map(s => s.trim()).filter(Boolean);
        const hr = modal.hr.map(s => s.trim()).filter(Boolean);
        const crisis = modal.crisis.map(s => s.trim()).filter(Boolean);

        try {
            const url = modal.mode === "create"
                ? `${API_BASE}/content/support-tools`
                : `${API_BASE}/content/support-tools/${modal.selectedId}`;

            const method = modal.mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tips,
                    eap,
                    hr,
                    crisis,
                    domain: modal.domain,
                    isActive: true, // Default active
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            closeModal();
            await fetchResources();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : `${modal.mode === "create" ? "Create" : "Update"} failed`;
            alert(msg);
        }
    }

    async function deleteResource(id: string) {
        if (!confirm("Delete this resource configuration?")) return;
        try {
            const res = await fetch(`${API_BASE}/content/support-tools/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error(await res.text());
            await fetchResources();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            alert(msg);
        }
    }

    if (loading) return <div className="p-4">Loading...</div>;
    if (err) return <div className="p-4 text-red-600">{err}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Resources Management</h1>
                <p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain}</span></p>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03]">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800 dark:text-white">Support Tool Contents</h2>
                    <button
                        onClick={openCreateModal}
                        className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
                    >
                        Create +
                    </button>
                </div>

                <div className="divide-y">
                    {items.length === 0 && (
                        <div className="p-4 text-gray-500 text-center">
                            No resources found. Click &quot;Create +&quot; to add one.
                        </div>
                    )}
                    {items.map((item) => (
                        <div
                            key={item._id}
                            className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Version: {item.version} | Active: {item.isActive ? "Yes" : "No"} | Domain: {item.domain || "N/A"}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                                    <div>
                                        <strong>Tips:</strong> {item.tips.length} items
                                    </div>
                                    <div>
                                        <strong>EAP:</strong> {item.eap.length} items
                                    </div>
                                    <div>
                                        <strong>HR:</strong> {item.hr.length} items
                                    </div>
                                    <div>
                                        <strong>Crisis:</strong> {item.crisis.length} items
                                    </div>
                                </div>
                                {item.updatedAt && (
                                    <div className="text-xs text-gray-400">
                                        Updated: {new Date(item.updatedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => openEditModal(item)}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteResource(item._id)}
                                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[90vh] flex flex-col">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10 rounded-t-xl">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {modal.mode === "create" ? "Create Resources" : "Edit Resources"}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Domain
                                </label>
                                <input
                                    type="text"
                                    value={modal.domain}
                                    onChange={(e) => setModal({ ...modal, domain: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="e.g., example.com"
                                />
                            </div>

                            <ListEditor
                                title="Mental Health Tips"
                                items={modal.tips}
                                onChange={(items) => updateListInternal("tips", items)}
                            />
                            <ListEditor
                                title="EAP Contact"
                                items={modal.eap}
                                onChange={(items) => updateListInternal("eap", items)}
                            />
                            <ListEditor
                                title="HR Support"
                                items={modal.hr}
                                onChange={(items) => updateListInternal("hr", items)}
                            />
                            <ListEditor
                                title="Crisis Line"
                                items={modal.crisis}
                                onChange={(items) => updateListInternal("crisis", items)}
                            />
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-6 flex gap-3 justify-end rounded-b-xl z-10">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveResource}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                {modal.mode === "create" ? "Create" : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for editing a list of strings
function ListEditor({
    title,
    items,
    onChange
}: {
    title: string;
    items: string[];
    onChange: (newItems: string[]) => void;
}) {
    function handleChange(idx: number, val: string) {
        const next = [...items];
        next[idx] = val;
        onChange(next);
    }

    function add() {
        onChange([...items, ""]);
    }

    function remove(idx: number) {
        onChange(items.filter((_, i) => i !== idx));
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
                <button
                    onClick={add}
                    className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded"
                >
                    + Add Item
                </button>
            </div>
            {items.length === 0 && <p className="text-sm text-gray-400 italic">No items yet.</p>}
            <div className="space-y-2">
                {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={it}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            placeholder={`Item ${idx + 1}`}
                        />
                        <button
                            onClick={() => remove(idx)}
                            className="text-red-500 hover:text-red-700 px-2"
                            title="Remove"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
