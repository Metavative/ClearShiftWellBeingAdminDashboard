"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type SupportRequestItem = {
  _id: string;
  domain: string;
  employeeId: string;
  supportType: "hr" | "eap" | "crisis" | "other";
  message: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  checkinId?: string;
  status: "new" | "in_progress" | "resolved";
  routedTo?: number;
  submittedAt: string;
};

const statusLabel: Record<SupportRequestItem["status"], string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function AdminSupportRequestsPage() {
  const [domain, setDomain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<SupportRequestItem[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [statusBusyId, setStatusBusyId] = useState<string>("");

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

  useEffect(() => {
    if (!domain) return;
    fetchSupportRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, employeeFilter, statusFilter]);

  async function fetchSupportRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ domain });
      if (employeeFilter.trim()) params.append("employeeId", employeeFilter.trim());
      if (statusFilter.trim()) params.append("status", statusFilter.trim());
      params.append("limit", "200");

      const res = await fetch(`${API_BASE}/support-request?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setItems(list);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load support requests.");
    } finally {
      setLoading(false);
    }
  }

  async function setRequestStatus(
    id: string,
    status: SupportRequestItem["status"]
  ) {
    if (!id || !domain) return;
    setStatusBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/support-request/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const updated = data?.item as SupportRequestItem | undefined;
      if (updated?._id) {
        setItems((prev) =>
          prev.map((it) => (it._id === updated._id ? { ...it, ...updated } : it))
        );
      } else {
        await fetchSupportRequests();
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Failed to update request status.";
      alert(message);
    } finally {
      setStatusBusyId("");
    }
  }

  const summary = useMemo(() => {
    const counts = { total: items.length, hr: 0, eap: 0, crisis: 0, other: 0 };
    for (const item of items) {
      if (item.supportType === "hr") counts.hr += 1;
      else if (item.supportType === "eap") counts.eap += 1;
      else if (item.supportType === "crisis") counts.crisis += 1;
      else counts.other += 1;
    }
    return counts;
  }, [items]);

  if (loading && !domain) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support Requests</h1>
        <p className="text-sm text-gray-500">
          Domain: <span className="font-mono">{domain}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={summary.total} />
        <StatCard label="HR" value={summary.hr} />
        <StatCard label="EAP" value={summary.eap} />
        <StatCard label="Crisis" value={summary.crisis} />
        <StatCard label="Other" value={summary.other} />
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-xl border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employee ID
            </label>
            <input
              type="text"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder="Filter by employee"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button
            onClick={fetchSupportRequests}
            className="h-10 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white dark:bg-white/[0.03]">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            Requests ({items.length})
          </h2>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading requests...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No support requests found for this domain.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item._id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.employeeId || "Anonymous"}
                  </span>
                  <span className="text-xs rounded-full px-2 py-1 bg-indigo-100 text-indigo-700">
                    {String(item.supportType || "other").toUpperCase()}
                  </span>
                  <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-700">
                    {statusLabel[item.status] || "New"}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(item.submittedAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {item.message?.trim() || "No message provided."}
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    Contact Name:{" "}
                    <span className="font-medium">{item.contact?.name || "N/A"}</span>
                  </div>
                  <div>
                    Contact Email:{" "}
                    <span className="font-medium">{item.contact?.email || "N/A"}</span>
                  </div>
                  <div>
                    Contact Phone:{" "}
                    <span className="font-medium">{item.contact?.phone || "N/A"}</span>
                  </div>
                  <div>
                    Check-in Ref:{" "}
                    <span className="font-medium">{item.checkinId || "N/A"}</span>
                  </div>
                  <div>
                    Routed To:{" "}
                    <span className="font-medium">{item.routedTo ?? 0} recipient(s)</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    disabled={statusBusyId === item._id || item.status === "new"}
                    onClick={() => setRequestStatus(item._id, "new")}
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark New
                  </button>
                  <button
                    disabled={
                      statusBusyId === item._id || item.status === "in_progress"
                    }
                    onClick={() => setRequestStatus(item._id, "in_progress")}
                    className="px-3 py-1 text-xs rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark In Progress
                  </button>
                  <button
                    disabled={statusBusyId === item._id || item.status === "resolved"}
                    onClick={() => setRequestStatus(item._id, "resolved")}
                    className="px-3 py-1 text-xs rounded-md border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark Resolved
                  </button>
                  {statusBusyId === item._id ? (
                    <span className="text-xs text-gray-500">Updating...</span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-white/[0.03] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
