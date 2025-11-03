"use client";

import React, { useCallback, useEffect, useState } from "react";

type Employee = {
    _id: string;
    domain: string;
    name: string;
    email: string;
    role: "employee" | "admin";
    emailVerified: boolean;
    createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE || "";

export default function AdminUsersPage() {
    const [domain, setDomain] = useState("");
    const [items, setItems] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // create form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // edit modal
    const [editing, setEditing] = useState<Employee | null>(null);
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<"employee"|"admin">("employee");
    const [editVerified, setEditVerified] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/me", { cache: "no-store" });
                const data = await res.json();
                if (!res.ok || !data?.ok) {
                    setErr("Session expired"); setLoading(false); return;
                }
                setDomain(data.admin.domain);
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : "Failed to load session"); setLoading(false);
            }
        })();
    }, []);

    const reload = useCallback(async () => {
        if (!domain) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/company/users?domain=${encodeURIComponent(domain)}`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setItems(Array.isArray(data) ? data : data.items || []);
            setErr(null);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => { if (domain) reload(); }, [domain, reload]);

    // reload is defined above with useCallback

    async function createUser() {
        if (!email) return;
        try {
            const res = await fetch(`${API}/company/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain, name, email }),
            });
            if (!res.ok) throw new Error(await res.text());
            setName(""); setEmail("");
            await reload();
            alert("Invitation sent");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Create failed";
            alert(msg);
        }
    }

    function openEdit(u: Employee) {
        setEditing(u);
        setEditName(u.name || "");
        setEditRole(u.role);
        setEditVerified(!!u.emailVerified);
    }

    async function saveEdit() {
        if (!editing) return;
        try {
            const res = await fetch(`${API}/company/users/${editing._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain,
                    name: editName,
                    role: editRole,
                    emailVerified: editVerified,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            setEditing(null);
            await reload();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Update failed";
            alert(msg);
        }
    }

    async function removeUser(id: string) {
        if (!confirm("Delete this user?")) return;
        try {
            const res = await fetch(`${API}/company/users/${id}?domain=${encodeURIComponent(domain)}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(await res.text());
            await reload();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            alert(msg);
        }
    }

    if (loading) return <div className="p-6">Loading…</div>;
    if (err) return <div className="p-6 text-red-600">{err}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Users</h1>
                <p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain}</span></p>
            </div>

            {/* Create */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-xs text-gray-500">Name (optional)</label>
                        <input className="mt-1 h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                               value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <input className="mt-1 h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                               value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@company.com" />
                    </div>
                </div>
                <div className="mt-3">
                    <button onClick={createUser}
                            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700">
                        Invite User
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="divide-y">
                    {items.length === 0 && <div className="p-4 text-gray-500">No users yet.</div>}
                    {items.map(u => (
                        <div key={u._id} className="p-4 flex items-center justify-between gap-4">
                            <div>
                                <div className="font-medium">{u.name || "(no name)"} <span className="text-xs text-gray-400">• {u.role}</span></div>
                                <div className="text-xs text-gray-500">{u.email}</div>
                                <div className="text-[11px] text-gray-400">{u.emailVerified ? "Verified" : "Unverified"}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="text-indigo-600 hover:text-indigo-700 text-sm" onClick={() => openEdit(u)}>Edit</button>
                                <button className="text-red-600 hover:text-red-700 text-sm" onClick={() => removeUser(u._id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="text-lg font-semibold mb-4">Edit User</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Name</label>
                                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                                       className="mt-1 h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Role</label>
                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value as "employee" | "admin")}
                                            className="mt-1 h-11 w-full rounded-lg border px-3 text-sm dark:bg-gray-800">
                                        <option value="employee">Employee</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm mt-6">
                                    <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)} />
                                    Email Verified
                                </label>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                            <button onClick={saveEdit} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
