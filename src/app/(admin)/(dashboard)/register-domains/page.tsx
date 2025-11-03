"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../../../components/ui/table";
import Badge from "../../../../components/ui/badge/Badge";

// ====== API base & endpoints (adjust if needed) ======
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000"; // e.g. "https://api.yourdomain.com"
const ENDPOINTS = {
    list: `${API_BASE}/domains`,                     // GET
    preview: `${API_BASE}/domains/verify/preview`,   // POST { domain, ttl? }
    initiate: `${API_BASE}/domains/verify/initiate`, // POST { domain, ttl? }
    check: `${API_BASE}/domains/verify/check`,       // GET ?domain=...
    update: (id: string) => `${API_BASE}/domains/${id}`, // PATCH
    delete: (id: string) => `${API_BASE}/domains/${id}`, // DELETE
};

// ====== Types aligned with your controllers/model ======
type DomainRow = {
    _id: string;
    domain: string;
    host: string;       // e.g. "_gp-verify"
    token: string;      // e.g. "gp-verify=<random>"
    ttl: number;
    status: "pending" | "verified" | "failed";
    verifiedAt?: string | null;
    lastCheckedAt?: string | null;
    expiresAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

type ListRes = {
    items: DomainRow[];
    total: number;
    page: number;
    limit: number;
    pages: number;
};

type CheckRes =
    | {
    status: "verified";
    domain: string;
    fqdn: string;
    token: string;
    answers: string[];
    verifiedAt: string;
}
    | {
    status: "pending" | "failed" | string;
    domain: string;
    fqdn: string;
    expectedToken: string;
    answers: string[];
    rawAnswers?: string[][];
    resolverError?: { name: string; code: string; message: string };
    note?: string;
};

// ====== Helpers ======
function statusToBadge(status: DomainRow["status"]): { label: string; color: "success" | "warning" | "error" } {
    switch (status) {
        case "verified":
            return { label: "Active", color: "success" };
        case "pending":
            return { label: "Pending", color: "warning" };
        default:
            return { label: "Failed", color: "error" };
    }
}

const Page = () => {
    // Table state
    const [rows, setRows] = useState<DomainRow[]>([]);
    const [loadingTable, setLoadingTable] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);

    // Create modal state (reusing from earlier flow if you used it)
    const [createOpen, setCreateOpen] = useState(false);

    // Details modal state
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<DomainRow | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [detailsCheck, setDetailsCheck] = useState<CheckRes | null>(null);
    const [detailsLoading, setDetailsLoading] = useState<"idle" | "check">("idle");

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editDomain, setEditDomain] = useState("");
    const [editHost, setEditHost] = useState("");
    const [editTTL, setEditTTL] = useState<number | "">("");
    const [editError, setEditError] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState<"idle" | "save">("idle");

    // ====== Data fetchers ======
    async function fetchRows() {
        setLoadingTable(true);
        setTableError(null);
        try {
            const res = await fetch(`${ENDPOINTS.list}?limit=100`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data: ListRes | DomainRow[] = await res.json();
            const items = Array.isArray(data) ? data : data.items;
            setRows(items || []);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to load domains.";
            setTableError(message);
            setRows([]);
        } finally {
            setLoadingTable(false);
        }
    }

    useEffect(() => {
        fetchRows();
    }, []);

    // ====== Row actions ======
    async function deleteRow(id: string) {
        if (!confirm("Delete this domain record?")) return;
        try {
            const res = await fetch(ENDPOINTS.delete(id), { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            await fetchRows();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Delete failed.";
            alert(message);
        }
    }

    async function checkNow(domain: string) {
        try {
            const url = new URL(ENDPOINTS.check, typeof window === "undefined" ? "http://localhost" : window.location.origin);
            url.searchParams.set("domain", domain);
            const res = await fetch(url.toString(), { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data: CheckRes = await res.json();
            if (data.status === "verified") {
                alert(`✅ ${domain} verified!`);
            } else {
                alert(`Status: ${data.status}\nAnswers: ${(("answers" in data) && data.answers?.join(" | ")) || "—"}`);
            }
            await fetchRows();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Check failed.";
            alert(message);
        }
    }

    // ====== Details modal ======
    function openDetails(row: DomainRow) {
        setSelectedRow(row);
        setDetailsOpen(true);
        setDetailsError(null);
        setDetailsCheck(null);
        setDetailsLoading("idle");
    }
    function closeDetails() {
        setDetailsOpen(false);
        setSelectedRow(null);
        setDetailsError(null);
        setDetailsCheck(null);
        setDetailsLoading("idle");
    }
    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Copied!");
        } catch {
            alert("Could not copy to clipboard.");
        }
    };
    async function detailsCheckStatus() {
        if (!selectedRow) return;
        setDetailsError(null);
        setDetailsLoading("check");
        setDetailsCheck(null);
        try {
            const url = new URL(ENDPOINTS.check, typeof window === "undefined" ? "http://localhost" : window.location.origin);
            url.searchParams.set("domain", selectedRow.domain);
            const res = await fetch(url.toString(), { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data: CheckRes = await res.json();
            setDetailsCheck(data);
            if (data.status === "verified") {
                await fetchRows(); // refresh table to reflect verified
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to check verification.";
            setDetailsError(message);
        } finally {
            setDetailsLoading("idle");
        }
    }

    // ====== Edit modal ======
    function openEdit(row: DomainRow) {
        setSelectedRow(row);
        setEditDomain(row.domain);
        setEditHost(row.host);
        setEditTTL(row.ttl ?? "");
        setEditError(null);
        setEditLoading("idle");
        setEditOpen(true);
    }
    function closeEdit() {
        setEditOpen(false);
        setSelectedRow(null);
        setEditError(null);
        setEditLoading("idle");
    }
    async function saveEdit() {
        if (!selectedRow?._id) return;
        setEditError(null);
        setEditLoading("save");
        try {
            const res = await fetch(ENDPOINTS.update(selectedRow._id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    domain: editDomain || undefined,
                    host: editHost || undefined,
                    ttl: editTTL === "" ? undefined : Number(editTTL),
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            await fetchRows();
            closeEdit();
            alert("Saved. (Token may be rotated and status reset to pending if fields changed.)");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Update failed.";
            setEditError(message);
        } finally {
            setEditLoading("idle");
        }
    }

    return (
        <div className={"mt-20"}>
            <div className={"flex items-center justify-between mb-4"}>
                <h1 className={"text-3xl font-semibold"}>Registered Domains</h1>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
                >
                    Create +
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <div className="min-w-[1102px]">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Domain</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Host</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Value</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">TTL</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Manage</TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {loadingTable && (
                                    <TableRow>
                                        <TableCell className="px-5 py-4" {...({ colSpan: 6 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>Loading…</TableCell>
                                    </TableRow>
                                )}
                                {tableError && !loadingTable && (
                                    <TableRow>
                                        <TableCell className="px-5 py-4 text-red-600" {...({ colSpan: 6 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>{tableError}</TableCell>
                                    </TableRow>
                                )}
                                {!loadingTable && !tableError && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell className="px-5 py-4" {...({ colSpan: 6 } as React.TdHTMLAttributes<HTMLTableCellElement>)}>No domains yet. Click “Create +”.</TableCell>
                                    </TableRow>
                                )}

                                {rows.map((row) => {
                                    const fqdn = `${row.host}.${row.domain}`;
                                    const { label, color } = statusToBadge(row.status);
                                    return (
                                        <TableRow key={row._id}>
                                            <TableCell className="px-5 py-4 sm:px-6 text-start">
                                                <button
                                                    className="block font-medium text-indigo-600 hover:underline text-left"
                                                    onClick={() => openDetails(row)}
                                                    title="View & copy TXT details"
                                                >
                                                    {row.domain}
                                                </button>
                                                <span className="block text-xs text-gray-500">
                          {row.verifiedAt ? `Verified: ${new Date(row.verifiedAt).toLocaleString()}` : `Updated: ${row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}`}
                        </span>
                                            </TableCell>

                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 break-all">
                                                {fqdn}
                                            </TableCell>

                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 break-all">
                                                {row.token}
                                            </TableCell>

                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {row.ttl ?? "—"}
                                            </TableCell>

                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                <Badge size="sm" color={color}>{label}</Badge>
                                            </TableCell>

                                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 flex items-center gap-x-3">
                                                {/* Delete */}
                                                <button
                                                    title="Delete"
                                                    onClick={() => deleteRow(row._id)}
                                                    className="text-gray-700 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                                                        <path fill="currentColor" fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd"></path>
                                                    </svg>
                                                </button>

                                                {/* Edit */}
                                                <button
                                                    title="Edit"
                                                    onClick={() => openEdit(row)}
                                                    className="text-gray-700 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                                                        <path fill="currentColor" fillRule="evenodd" d="M21.455 5.416a.75.75 0 0 1-.096.943l-9.193 9.192a.75.75 0 0 1-.34.195l-3.829 1a.75.75 0 0 1-.915-.915l1-3.828a.8.8 0 0 1 .161-.312L17.47 2.47a.75.75 0 0 1 1.06 0l2.829 2.828a1 1 0 0 1 .096.118m-1.687.412L18 4.061l-8.518 8.518l-.625 2.393l2.393-.625z" clipRule="evenodd" />
                                                        <path fill="currentColor" d="M19.641 17.16a44.4 44.4 0 0 0 .261-7.04a.4.4 0 0 1 .117-.3l.984-.984a.198.198 0 0 1 .338.127a46 46 0 0 1-.21 8.372c-.236 2.022-1.86 3.607-3.873 3.832a47.8 47.8 0 0 1-10.516 0c-2.012-.225-3.637-1.81-3.873-3.832a46 46 0 0 1 0-10.67c.236-2.022 1.86-3.607 3.873-3.832a48 48 0 0 1 7.989-.213a.2.2 0 0 1 .128.34l-.993.992a.4.4 0 0 1-.297.117a46 46 0 0 0-6.66.255a2.89 2.89 0 0 0-2.55 2.516a44.4 44.4 0 0 0 0 10.32a2.89 2.89 0 0 0 2.55 2.516c3.355.375 6.827.375 10.183 0a2.89 2.89 0 0 0 2.55-2.516" />
                                                    </svg>
                                                </button>

                                                {/* Check quick */}
                                                <button
                                                    title="Check Verification"
                                                    onClick={() => checkNow(row.domain)}
                                                    className="text-gray-700 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                                                >
                                                    🔍
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

            {/* ===== DETAILS MODAL (click domain title) ===== */}
            {detailsOpen && selectedRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                                TXT Details — {selectedRow.domain}
                            </h4>
                            <button onClick={closeDetails} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                        </div>

                        <div className="mt-5 space-y-5">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Host</div>
                                    <div className="mt-1 font-mono text-sm break-all">{`${selectedRow.host}.${selectedRow.domain}`}</div>
                                    <button
                                        type="button"
                                        onClick={() => copy(`${selectedRow.host}.${selectedRow.domain}`)}
                                        className="mt-2 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Copy Host
                                    </button>
                                </div>

                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Value</div>
                                    <div className="mt-1 font-mono text-sm break-all">{selectedRow.token}</div>
                                    <button
                                        type="button"
                                        onClick={() => copy(selectedRow.token)}
                                        className="mt-2 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Copy Value
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={detailsCheckStatus}
                                    disabled={detailsLoading === "check"}
                                    className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                    {detailsLoading === "check" ? "Checking..." : "Check Status"}
                                </button>
                                <span className="text-xs text-gray-500 self-center">
                  TTL: {selectedRow.ttl ?? "—"} • Status: {selectedRow.status}
                </span>
                            </div>

                            {detailsError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                                    {detailsError}
                                </div>
                            )}

                            {detailsCheck && (
                                <div
                                    className="rounded-lg border p-4 text-sm"
                                    style={{
                                        borderColor:
                                            detailsCheck.status === "verified"
                                                ? "rgb(22 163 74)"
                                                : detailsCheck.status === "pending"
                                                    ? "rgb(59 130 246)"
                                                    : "rgb(239 68 68)",
                                    }}
                                >
                                    <div className="font-medium">
                                        {detailsCheck.status === "verified"
                                            ? "✅ Verified"
                                            : detailsCheck.status === "pending"
                                                ? "🔄 Pending"
                                                : "❌ Not Verified"}
                                    </div>
                                    {"answers" in detailsCheck && detailsCheck.answers?.length > 0 && (
                                        <div className="mt-2">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Resolver TXT values seen:</div>
                                            <div className="mt-1 font-mono text-xs break-all">
                                                {detailsCheck.answers.join(" | ")}
                                            </div>
                                        </div>
                                    )}
                                    {"note" in detailsCheck && detailsCheck.note && (
                                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{detailsCheck.note}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== EDIT MODAL ===== */}
            {editOpen && selectedRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                                Edit Domain — {selectedRow.domain}
                            </h4>
                            <button onClick={closeEdit} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                        </div>

                        <div className="mt-5 space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Domain</label>
                                    <input
                                        type="text"
                                        value={editDomain}
                                        onChange={(e) => setEditDomain(e.target.value)}
                                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Host</label>
                                    <input
                                        type="text"
                                        value={editHost}
                                        onChange={(e) => setEditHost(e.target.value)}
                                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">TTL (seconds)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        placeholder="3600"
                                        value={editTTL}
                                        onChange={(e) => setEditTTL(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={editLoading === "save"}
                                    className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-2 text-sm bg-indigo-600 text-white shadow-theme-xs hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {editLoading === "save" ? "Saving..." : "Save Changes"}
                                </button>
                                {editError && (
                                    <div className="ml-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                                        {editError}
                                    </div>
                                )}
                                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 self-center">
                                    Saving may rotate token & reset status (server logic).
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OPTIONAL: your existing Create modal can live here; keeping createOpen for future use */}
            {createOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">Create Domain</h4>
                            <button onClick={() => setCreateOpen(false)} className="rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                            You can reuse your earlier “Preview → Submit & Save” modal here if you want the create flow on this page.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Page;
