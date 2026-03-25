"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type WeeklyTheme = {
  topic?: string;
  count?: number;
};

type WeeklySummary = {
  total: number;
  red: number;
  amber: number;
  green: number;
  themes: WeeklyTheme[];
};

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date = new Date()) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummary>({
    total: 0,
    red: 0,
    amber: 0,
    green: 0,
    themes: [],
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (!meRes.ok || !meData?.ok || !meData?.admin?.domain) {
          throw new Error("Session expired. Please log in again.");
        }

        const adminDomain = String(meData.admin.domain || "").trim();
        setDomain(adminDomain);

        const params = new URLSearchParams({
          domain: adminDomain,
          start: startOfWeek().toISOString(),
          end: endOfWeek().toISOString(),
        });

        const weeklyRes = await fetch(`${API_BASE}/reports/weekly?${params.toString()}`, {
          cache: "no-store",
        });

        if (!weeklyRes.ok) {
          if (weeklyRes.status === 404) {
            setSummary({
              total: 0,
              red: 0,
              amber: 0,
              green: 0,
              themes: [],
            });
            setErr(null);
            return;
          }
          throw new Error("Unable to load weekly reporting summary.");
        }

        const weeklyData = await weeklyRes.json();
        setSummary({
          total: Number(weeklyData?.total || 0),
          red: Number(weeklyData?.red || 0),
          amber: Number(weeklyData?.amber || 0),
          green: Number(weeklyData?.green || 0),
          themes: Array.isArray(weeklyData?.themes) ? weeklyData.themes : [],
        });
        setErr(null);
      } catch (error: unknown) {
        setErr(error instanceof Error ? error.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const percentages = useMemo(() => {
    if (!summary.total) return { red: 0, amber: 0, green: 0 };
    return {
      red: Math.round((summary.red / summary.total) * 100),
      amber: Math.round((summary.amber / summary.total) * 100),
      green: Math.round((summary.green / summary.total) * 100),
    };
  }, [summary]);

  const topThemes = useMemo(
    () =>
      summary.themes
        .map((item) => {
          const topic = String(item?.topic || "").trim();
          const count = Number(item?.count || 0);
          if (!topic) return null;
          return { topic, count };
        })
        .filter((item): item is { topic: string; count: number } => Boolean(item))
        .slice(0, 3),
    [summary.themes],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Employer reporting dashboard
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Organisation Reporting Overview</h1>
            <p className="max-w-3xl text-sm text-gray-600">
              This dashboard is built for anonymous employer reporting. It surfaces weekly RAG totals,
              trend summaries, and top wellbeing themes without exposing employee emails in the reporting view.
            </p>
            <p className="text-sm text-gray-500">
              Domain: <span className="font-mono">{domain || "clearshiftwellbeing.co.uk"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin/checkin-responses")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Review Anonymous Responses
            </button>
            <button
              onClick={() => router.push("/admin/support-requests")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Support Requests
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total check-ins this week" value={summary.total} tone="slate" />
        <MetricCard label="Red" value={summary.red} hint={`${percentages.red}%`} tone="red" />
        <MetricCard label="Amber" value={summary.amber} hint={`${percentages.amber}%`} tone="amber" />
        <MetricCard label="Green" value={summary.green} hint={`${percentages.green}%`} tone="green" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly anonymised summary</h2>
              <p className="text-sm text-gray-500">
                The employer view is designed around visual RAG summaries rather than raw personal identifiers.
              </p>
            </div>
            {loading ? <span className="text-sm text-gray-400">Loading...</span> : null}
          </div>

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : (
            <div className="space-y-4">
              <TrendBar label="Red concern" value={summary.red} percent={percentages.red} color="bg-rose-500" />
              <TrendBar label="Amber caution" value={summary.amber} percent={percentages.amber} color="bg-amber-400" />
              <TrendBar label="Green positive" value={summary.green} percent={percentages.green} color="bg-emerald-500" />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Top themes</h2>
          <p className="mb-5 text-sm text-gray-500">
            Organisations will be able to interpret the data through grouped themes and totals.
          </p>
          <div className="space-y-3">
            {topThemes.length ? (
              topThemes.map((theme, index) => (
                <div
                  key={`${theme.topic}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{theme.topic}</p>
                    <p className="text-xs text-gray-500">Wellbeing theme</p>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                    {theme.count}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                Top themes will appear here once more weekly data is available.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Remaining delivery items</h2>
          <p className="mb-5 text-sm text-gray-500">
            These are the client follow-up items currently still in progress before final rollout.
          </p>
          <div className="space-y-3">
            <StatusRow
              title="Final aggregated reporting view"
              status="In progress"
              detail="Dashboard reporting is now moving toward a dedicated employer-friendly summary view with visual interpretation."
              tone="amber"
            />
            <StatusRow
              title="Weekly anonymised PDF reporting"
              status="In progress"
              detail="Weekly totals and themes are already structured for anonymised export and can be finalized into the employer PDF workflow."
              tone="amber"
            />
            <StatusRow
              title="Final launch and production setup"
              status="Pending final rollout"
              detail="Production deployment, distribution setup, and launch checks remain the last release-phase step."
              tone="slate"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">What the employer reporting will include</h2>
          <p className="mb-5 text-sm text-gray-500">
            This answers the client question about graphs and summaries versus raw answer lists.
          </p>
          <div className="space-y-3">
            <InfoRow text="RAG totals and trend summaries for fast interpretation." />
            <InfoRow text="Top wellbeing themes grouped into concise reporting insights." />
            <InfoRow text="Anonymous reporting outputs with no employee email visibility." />
            <InfoRow text="Admin-facing summaries that are clearer than raw answer-by-answer review." />
          </div>

          <div className="mt-6 rounded-xl bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">Next steps after this</p>
            <p className="mt-2 text-sm text-indigo-800">
              Finalize the employer reporting screen, complete weekly anonymised PDF output, and move the admin and mobile apps through production launch setup.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: "slate" | "red" | "amber" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "bg-rose-50 text-rose-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-50 text-slate-700";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
        {label}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {hint ? <p className="text-sm text-gray-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function TrendBar({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="text-gray-500">
          {value} ({percent}%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-gray-100">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${Math.max(percent, value > 0 ? 8 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function StatusRow({
  title,
  status,
  detail,
  tone,
}: {
  title: string;
  status: string;
  detail: string;
  tone: "amber" | "slate";
}) {
  const badgeClass =
    tone === "amber"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{detail}</p>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-600" />
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}
