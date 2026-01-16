"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type PrivacyPolicy = {
    _id: string;
    title: string;
    content: string;
    isActive: boolean;
    domain?: string;
    createdAt?: string;
    updatedAt?: string;
};

type CreateEditModal = {
    isOpen: boolean;
    mode: "create" | "edit";
    selectedId?: string;
    title: string;
    content: string;
    domain: string;
};

export default function AdminPrivacyPoliciesPage() {
    const [domain, setDomain] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [items, setItems] = useState<PrivacyPolicy[]>([]);
    const [modal, setModal] = useState<CreateEditModal>({
        isOpen: false,
        mode: "create",
        title: "",
        content: "",
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

    // 2) Load privacy policies
    useEffect(() => {
        if (!domain) return;
        fetchPrivacyPolicies();
    }, [domain]);

    async function fetchPrivacyPolicies() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/content/privacy-policies`, {
                cache: "no-store",
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            console.log("Fetched privacy policies data: ", data);
            setItems(Array.isArray(data.data) ? data.data : data.data.items || []);
            setErr(null);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to load privacy policies.");
        } finally {
            setLoading(false);
        }
    }



    function openCreateModal() {
        setModal({
            isOpen: true,
            mode: "create",
            title: "",
            content: "",
            domain: domain,
        });
    }

    function openEditModal(policy: PrivacyPolicy) {
        setModal({
            isOpen: true,
            mode: "edit",
            selectedId: policy._id,
            title: policy.title,
            content: policy.content,
            domain: policy.domain || domain,
        });
    }

    function closeModal() {
        setModal({
            isOpen: false,
            mode: "create",
            title: "",
            content: "",
            domain: "",
        });
    }

    async function savePrivacyPolicy() {
        if (!modal.title.trim() || !modal.content.trim()) {
            alert("Title and content are required.");
            return;
        }

        try {
            const url = modal.mode === "create"
                ? `${API_BASE}/content/privacy-policy`
                : `${API_BASE}/content/privacy-policy/${modal.selectedId}`;

            const method = modal.mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: modal.title.trim(),
                    content: modal.content.trim(),
                    domain: modal.domain,
                    isActive: true,
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            closeModal();
            await fetchPrivacyPolicies();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : `${modal.mode === "create" ? "Create" : "Update"} failed`;
            alert(msg);
        }
    }

    async function deletePrivacyPolicy(id: string) {
        if (!confirm("Delete this privacy policy?")) return;
        try {
            const res = await fetch(`${API_BASE}/content/privacy-policy/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error(await res.text());
            await fetchPrivacyPolicies();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            alert(msg);
        }
    }

    if (loading) return <div className="p-4">Loading…</div>;
    if (err) return <div className="p-4 text-red-600">{err}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Privacy Policy Management</h1>
                <p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain}</span></p>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03]">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800 dark:text-white">Privacy Policies</h2>
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
                            No privacy policies yet. Click &quot;Create +&quot; to add one.
                        </div>
                    )}
                    {items.map((policy) => (
                        <div
                            key={policy._id}
                            className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 dark:text-white truncate">
                                    {policy.title}
                                </div>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {policy.content}
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <span className={`px-2 py-1 rounded-md ${policy.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                        {policy.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <span>Domain: {policy.domain || "N/A"}</span>
                                    {policy.updatedAt && (
                                        <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => openEditModal(policy)}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deletePrivacyPolicy(policy._id)}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {modal.mode === "create" ? "Create Privacy Policy" : "Edit Privacy Policy"}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={modal.title}
                                    onChange={(e) => setModal({ ...modal, title: e.target.value })}
                                    placeholder="e.g., Privacy Policy 2024"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Domain
                                </label>
                                <input
                                    type="text"
                                    value={modal.domain}
                                    onChange={(e) => setModal({ ...modal, domain: e.target.value })}
                                    placeholder="e.g., example.com"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Content
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                                    <ReactQuill
                                        className="h-[400px] mb-12"
                                        value={modal.content}
                                        onChange={(content) => setModal({ ...modal, content })}
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'color': [] }, { 'background': [] }],
                                                [{ 'align': [] }],
                                                ['blockquote', 'code-block'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                ['link', 'image'],
                                                ['clean']
                                            ]
                                        }}
                                        formats={[
                                            'header',
                                            'bold', 'italic', 'underline', 'strike',
                                            'color', 'background',
                                            'align',
                                            'blockquote', 'code-block',
                                            'list', 'indent',
                                            'link', 'image'
                                        ]}
                                        placeholder="Enter your privacy policy content here..."
                                        theme="snow"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Use the toolbar to format your privacy policy with headings, text styling, lists, links, and more.
                                </p>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-6 flex gap-3 justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={savePrivacyPolicy}
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
