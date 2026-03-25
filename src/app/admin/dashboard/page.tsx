"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ThemeItem = {
  topic: string;
  count: number;
};

type SummaryBucket = {
  total: number;
  red: number;
  amber: number;
  green: number;
  themes: ThemeItem[];
  start: string;
  end: string;
  label: string;
};

type DashboardSummaryResponse = {
  ok: boolean;
  domain: string;
  currentWeek: SummaryBucket;
  recentWeeks: SummaryBucket[];
  message?: string;
};

const emptyWeek: SummaryBucket = {
  total: 0,
  red: 0,
  amber: 0,
  green: 0,
  themes: [],
  start: "",
  end: "",
  label: "",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<SummaryBucket>(emptyWeek);
  const [recentWeeks, setRecentWeeks] = useState<SummaryBucket[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard-summary", {
          cache: "no-store",
        });
        const data: DashboardSummaryResponse = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "Unable to load dashboard.");
        }

        setDomain(String(data.domain || ""));
        setCurrentWeek(data.currentWeek || emptyWeek);
        setRecentWeeks(Array.isArray(data.recentWeeks) ? data.recentWeeks.slice(1) : []);
        setErr(null);
      } catch (error: unknown) {
        setErr(error instanceof Error ? error.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const percentages = useMemo(() => {
    if (!currentWeek.total) return { red: 0, amber: 0, green: 0 };
    return {
      red: Math.round((currentWeek.red / currentWeek.total) * 100),
      amber: Math.round((currentWeek.amber / currentWeek.total) * 100),
      green: Math.round((currentWeek.green / currentWeek.total) * 100),
    };
  }, [currentWeek]);

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
              This dashboard shows anonymised employer reporting using real check-in submissions for the selected organisation.
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

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total check-ins this week"
          value={currentWeek.total}
          hint={currentWeek.label || "Current week"}
          tone="slate"
        />
        <MetricCard label="Red" value={currentWeek.red} hint={`${percentages.red}%`} tone="red" />
        <MetricCard label="Amber" value={currentWeek.amber} hint={`${percentages.amber}%`} tone="amber" />
        <MetricCard label="Green" value={currentWeek.green} hint={`${percentages.green}%`} tone="green" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly anonymised summary</h2>
              <p className="text-sm text-gray-500">
                Each check-in is grouped into a single Red, Amber, or Green outcome for employer reporting.
              </p>
            </div>
            {loading ? <span className="text-sm text-gray-400">Loading...</span> : null}
          </div>

          <div className="space-y-4">
            <TrendBar label="Red concern" value={currentWeek.red} percent={percentages.red} color="bg-rose-500" />
            <TrendBar label="Amber caution" value={currentWeek.amber} percent={percentages.amber} color="bg-amber-400" />
            <TrendBar label="Green positive" value={currentWeek.green} percent={percentages.green} color="bg-emerald-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Top themes</h2>
          <p className="mb-5 text-sm text-gray-500">
            Top themes are the most repeated concern areas from non-green answers in the current week.
          </p>
          <div className="space-y-3">
            {currentWeek.themes.length ? (
              currentWeek.themes.map((theme, index) => (
                <div
                  key={`${theme.topic}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{theme.topic}</p>
                    <p className="text-xs text-gray-500">Repeated wellbeing concern</p>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                    {theme.count}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                No repeated concern theme has been detected yet for this week.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent report snapshots</h2>
          <p className="text-sm text-gray-500">
            This is how employer reports will be displayed here: one anonymised weekly summary card per reporting period.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReportCard
            label={currentWeek.label || "Current week"}
            total={currentWeek.total}
            red={currentWeek.red}
            amber={currentWeek.amber}
            green={currentWeek.green}
            topTheme={currentWeek.themes[0]?.topic || "No repeated theme yet"}
            active
          />
          {recentWeeks.map((week, index) => (
            <ReportCard
              key={`${week.label}-${index}`}
              label={week.label || `Week ${index + 1}`}
              total={week.total}
              red={week.red}
              amber={week.amber}
              green={week.green}
              topTheme={week.themes[0]?.topic || "No repeated theme yet"}
            />
          ))}
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
              detail="The dashboard now shows live weekly snapshots; the next step is expanding this into the full employer reporting experience."
              tone="amber"
            />
            <StatusRow
              title="Weekly anonymised PDF reporting"
              status="In progress"
              detail="The weekly summary is now structured for export, and the PDF delivery workflow can be connected next."
              tone="amber"
            />
            <StatusRow
              title="Final launch and production setup"
              status="Pending final rollout"
              detail="Production deployment, private distribution setup, and final release checks remain the last launch-stage step."
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
            <InfoRow text="RAG totals and visual trend bars for each reporting period." />
            <InfoRow text="Top concern themes based on repeated non-green answers." />
            <InfoRow text="Anonymous reporting outputs with no employee email visibility." />
            <InfoRow text="Weekly report snapshot cards that make each period easy to interpret." />
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
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {hint ? <p className="text-sm text-right text-gray-500">{hint}</p> : null}
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

function ReportCard({
  label,
  total,
  red,
  amber,
  green,
  topTheme,
  active,
}: {
  label: string;
  total: number;
  red: number;
  amber: number;
  green: number;
  topTheme: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            active ? "bg-indigo-100 text-indigo-700" : "bg-white text-gray-600"
          }`}
        >
          {active ? "Current" : "Snapshot"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MiniMetric label="Total" value={total} />
        <MiniMetric label="Red" value={red} />
        <MiniMetric label="Amber" value={amber} />
        <MiniMetric label="Green" value={green} />
      </div>
      <div className="mt-4 rounded-xl bg-white px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-gray-400">Top theme</p>
        <p className="mt-1 text-sm font-medium text-gray-800">{topTheme}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
