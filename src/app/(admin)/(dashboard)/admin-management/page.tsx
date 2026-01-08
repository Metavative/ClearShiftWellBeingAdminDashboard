"use client";

import React, { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableHeader, TableRow,
} from "../../../../components/ui/table";
import Badge from "../../../../components/ui/badge/Badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://clearshiftwellbeingapis-production.up.railway.app";
const ENDPOINTS = {
    admins: `${API_BASE}/admins`,
    adminId: (id: string) => `${API_BASE}/admins/${id}`,
    rotate: (id: string) => `${API_BASE}/admins/${id}/license/rotate`,
    revoke: (id: string) => `${API_BASE}/admins/${id}/license/revoke`,
    domains: `${API_BASE}/domains`,
};

type AdminRow = {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    domain: string;
    domainId: string;
    licenseKey: string;
    licenseStatus: "active" | "revoked";
    issuedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

type AdminListRes = {
    items: AdminRow[];
    total: number;
    page: number;
    limit: number;
    pages: number;
};

type DomainOption = { _id: string; domain: string };

function licenseBadge(status: AdminRow["licenseStatus"]): { text: string; color: "success" | "error" } {
    return status === "active" ? { text: "Active", color: "success" } : { text: "Revoked", color: "error" };
}

const Page = () => {
    // ===== Table =====
    const [rows, setRows] = useState<AdminRow[]>([]);
    const [loadingTable, setLoadingTable] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);

    // ===== Create modal =====
    const [createOpen, setCreateOpen] = useState(false);
    const [verifiedDomains, setVerifiedDomains] = useState<DomainOption[]>([]);
    const [cDomainId, setCDomainId] = useState<string>("");
    const [cFirst, setCFirst] = useState("");
    const [cLast, setCLast] = useState("");
    const [cEmail, setCEmail] = useState("");
    const [cPhone, setCPhone] = useState("");
    const [createLoading, setCreateLoading] = useState<"idle" | "loading">("idle");
    const [createError, setCreateError] = useState<string | null>(null);

    // ===== Details modal =====
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [sel, setSel] = useState<AdminRow | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [detailsLoading, setDetailsLoading] = useState<"idle" | "rotate" | "revoke">("idle");

    // ===== Edit modal =====
    const [editOpen, setEditOpen] = useState(false);
    const [eFirst, setEFirst] = useState("");
    const [eLast, setELast] = useState("");
    const [eEmail, setEEmail] = useState("");
    const [ePhone, setEPhone] = useState("");
    const [editLoading, setEditLoading] = useState<"idle" | "save">("idle");
    const [editError, setEditError] = useState<string | null>(null);

    async function fetchAdmins() {
        setLoadingTable(true);
        setTableError(null);
        try {
            const res = await fetch(`${ENDPOINTS.admins}?limit=100`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data: AdminListRes | AdminRow[] = await res.json();
            const items = Array.isArray(data) ? data : data.items;
            setRows(items || []);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to load admins.";
            setTableError(message);
            setRows([]);
        } finally {
            setLoadingTable(false);
        }
    }

    async function fetchVerifiedDomains() {
        try {
            const res = await fetch(`${ENDPOINTS.domains}?status=verified&limit=200`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const list = await res.json();
            const items = Array.isArray(list) ? list : list.items;
            const itemsTyped = (items ?? []) as Array<{ _id: string; domain: string }>;
            const mapped: DomainOption[] = itemsTyped.map((d) => ({ _id: d._id, domain: d.domain }));
            setVerifiedDomains(mapped);
        } catch {
            setVerifiedDomains([]);
        }
    }

    useEffect(() => {
        fetchAdmins();
    }, []);

    // ===== Create handlers =====
    function openCreate() {
        setCFirst(""); setCLast(""); setCEmail(""); setCPhone(""); setCDomainId("");
        setCreateError(null); setCreateLoading("idle");
        setCreateOpen(true);
        fetchVerifiedDomains();
    }
    function closeCreate() {
        setCreateOpen(false);
    }
    async function submitCreate() {
        setCreateError(null);
        if (!cDomainId || !cFirst || !cLast || !cEmail) {
            setCreateError("Domain, First name, Last name, Email are required.");
            return;
        }
        const chosen = verifiedDomains.find(d => d._id === cDomainId);
        if (!chosen) {
            setCreateError("Please select a verified domain.");
            return;
        }
        setCreateLoading("loading");
        try {
            // Backend expects domain string (and will resolve domainId)
            const res = await fetch(ENDPOINTS.admins, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName: cFirst,
                    lastName: cLast,
                    email: cEmail,
                    phone: cPhone || undefined,
                    domain: chosen.domain,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            await fetchAdmins();
            closeCreate();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to create admin.";
            setCreateError(message);
        } finally {
            setCreateLoading("idle");
        }
    }

    // ===== Row actions =====
    async function deleteRow(id: string) {
        if (!confirm("Delete this admin?")) return;
        try {
            const res = await fetch(ENDPOINTS.adminId(id), { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            await fetchAdmins();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Delete failed.";
            alert(message);
        }
    }

    // ===== Details handlers =====
    function openDetails(row: AdminRow) {
        setSel(row);
        setDetailsOpen(true);
        setDetailsError(null);
        setDetailsLoading("idle");
    }
    function closeDetails() {
        setDetailsOpen(false);
        setSel(null);
        setDetailsError(null);
    }

    const copy = async (text: string) => {
        try { await navigator.clipboard.writeText(text); alert("Copied!"); }
        catch { alert("Could not copy"); }
    };

    async function rotateLicense(id: string) {
        setDetailsError(null);
        setDetailsLoading("rotate");
        try {
            const res = await fetch(ENDPOINTS.rotate(id), { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            await fetchAdmins();
            const updated = rows.find(r => r._id === id);
            if (updated) setSel(updated);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Rotate failed.";
            setDetailsError(message);
        } finally {
            setDetailsLoading("idle");
        }
    }

    async function revokeLicense(id: string) {
        setDetailsError(null);
        setDetailsLoading("revoke");
        try {
            const res = await fetch(ENDPOINTS.revoke(id), { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            await fetchAdmins();
            const updated = rows.find(r => r._id === id);
            if (updated) setSel(updated);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Revoke failed.";
            setDetailsError(message);
        } finally {
            setDetailsLoading("idle");
        }
    }

    // ===== Edit handlers =====
    function openEdit(row: AdminRow) {
        setSel(row);
        setEFirst(row.firstName); setELast(row.lastName); setEEmail(row.email); setEPhone(row.phone || "");
        setEditError(null); setEditLoading("idle");
        setEditOpen(true);
    }
    function closeEdit() {
        setEditOpen(false);
        setSel(null);
    }
    async function saveEdit() {
        if (!sel?._id) return;
        setEditError(null);
        setEditLoading("save");
        try {
            const res = await fetch(ENDPOINTS.adminId(sel._id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName: eFirst || undefined,
                    lastName: eLast || undefined,
                    email: eEmail || undefined,
                    phone: ePhone || undefined,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            await fetchAdmins();
            closeEdit();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Update failed.";
            setEditError(message);
        } finally {
            setEditLoading("idle");
        }
    }

    return (
        <div className="mt-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-semibold">Admins</h1>
                <button onClick={openCreate} className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600">
                    Create +
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <div className="min-w-[1102px]">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Admin</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Email</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Phone</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Domain</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">License</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Status</TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-theme-xs text-gray-500 dark:text-gray-400">Manage</TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {loadingTable && (
                                    <TableRow><TableCell className="px-5 py-4" {...({ colSpan: 7 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>Loading…</TableCell></TableRow>
                                )}
                                {tableError && !loadingTable && (
                                    <TableRow><TableCell className="px-5 py-4 text-red-600" {...({ colSpan: 7 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>{tableError}</TableCell></TableRow>
                                )}
                                {!loadingTable && !tableError && rows.length === 0 && (
                                    <TableRow><TableCell className="px-5 py-4" {...({ colSpan: 7 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>No admins yet. Click “Create +”.</TableCell></TableRow>
                                )}

                                {rows.map((r) => {
                                    const { text, color } = licenseBadge(r.licenseStatus);
                                    const name = `${r.firstName} ${r.lastName}`.trim();
                                    const masked = r.licenseKey.replace(/^(.{8}).+(.{4})$/, "$1••••••••••••$2");
                                    return (
                                        <TableRow key={r._id}>
                                            <TableCell className="px-5 py-4">
                                                <button className="font-medium text-indigo-600 hover:underline text-left"
                                                    onClick={() => openDetails(r)} title="View license & actions">
                                                    {name}
                                                </button>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">{r.email}</TableCell>
                                            <TableCell className="px-5 py-4">{r.phone || "—"}</TableCell>
                                            <TableCell className="px-5 py-4">{r.domain}</TableCell>
                                            <TableCell className="px-5 py-4 font-mono text-sm break-all">{masked}</TableCell>
                                            <TableCell className="px-5 py-4">
                                                <Badge size="sm" color={color}>{text}</Badge>
                                            </TableCell>
                                            <TableCell className="px-5 py-4 flex gap-3">
                                                {/* Edit */}
                                                <button className="text-gray-700 hover:text-indigo-500"
                                                    onClick={() => openEdit(r)} title="Edit">
                                                    ✏️
                                                </button>
                                                {/* Delete */}
                                                <button className="text-gray-700 hover:text-red-500"
                                                    onClick={() => deleteRow(r._id)} title="Delete">
                                                    🗑️
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* ===== CREATE MODAL ===== */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeCreate} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium">Create Admin</h4>
                            <button onClick={closeCreate} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100">✕</button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-xs text-gray-500">Verified Domain</label>
                                <select
                                    value={cDomainId}
                                    onChange={(e) => setCDomainId(e.target.value)}
                                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                >
                                    <option value="">Select a verified domain</option>
                                    {verifiedDomains.map(d => (
                                        <option key={d._id} value={d._id}>{d.domain}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">First Name</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={cFirst} onChange={e => setCFirst(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Last Name</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={cLast} onChange={e => setCLast(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Email</label>
                                    <input type="email" className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={cEmail} onChange={e => setCEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Phone (optional)</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={cPhone} onChange={e => setCPhone(e.target.value)} />
                                </div>
                            </div>

                            {createError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {createError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={submitCreate}
                                    disabled={createLoading === "loading"}
                                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {createLoading === "loading" ? "Creating..." : "Submit"}
                                </button>
                                <div className="ml-auto text-xs text-gray-500">
                                    A license key will be generated for the selected domain.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DETAILS MODAL (click name) ===== */}
            {detailsOpen && sel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium">Admin Details — {sel.firstName} {sel.lastName}</h4>
                            <button onClick={closeDetails} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100">✕</button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-gray-500">Domain</div>
                                    <div className="font-mono text-sm break-all">{sel.domain}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-gray-500">License Key</div>
                                    <div className="font-mono text-sm break-all">{sel.licenseKey}</div>
                                    <button onClick={() => copy(sel.licenseKey)} className="mt-2 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">
                                        Copy License
                                    </button>
                                </div>
                            </div>

                            {detailsError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{detailsError}</div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => rotateLicense(sel._id)}
                                    disabled={detailsLoading === "rotate"}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {detailsLoading === "rotate" ? "Rotating…" : "Rotate License"}
                                </button>
                                <button
                                    onClick={() => revokeLicense(sel._id)}
                                    disabled={detailsLoading === "revoke"}
                                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                    {detailsLoading === "revoke" ? "Revoking…" : "Revoke License"}
                                </button>
                                <span className="ml-auto text-xs text-gray-500 self-center">
                                    Status: {sel.licenseStatus} • Issued: {sel.issuedAt ? new Date(sel.issuedAt).toLocaleString() : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== EDIT MODAL ===== */}
            {editOpen && sel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium">Edit Admin — {sel.firstName} {sel.lastName}</h4>
                            <button onClick={closeEdit} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100">✕</button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">First Name</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={eFirst} onChange={e => setEFirst(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Last Name</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={eLast} onChange={e => setELast(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Email</label>
                                    <input type="email" className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={eEmail} onChange={e => setEEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500">Phone</label>
                                    <input className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm dark:bg-gray-900"
                                        value={ePhone} onChange={e => setEPhone(e.target.value)} />
                                </div>
                            </div>

                            {editError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={saveEdit}
                                    disabled={editLoading === "save"}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {editLoading === "save" ? "Saving…" : "Save Changes"}
                                </button>
                                <div className="ml-auto text-xs text-gray-500 self-center">
                                    Email update is allowed; license remains unchanged (rotate in Details if needed).
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Page;
