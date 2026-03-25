export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminTokenNode } from "@/lib/adminAuthNode";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type BackendAnswer = {
  question?: string;
  option?: string;
  description?: string;
  isPositive?: boolean;
};

type BackendCheckInResponse = {
  _id: string;
  domain?: string;
  answers?: BackendAnswer[];
  submittedAt?: string;
  createdAt?: string;
};

type SummaryBucket = {
  total: number;
  red: number;
  amber: number;
  green: number;
  themes: { topic: string; count: number }[];
  start: string;
  end: string;
  label: string;
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

function detectQuestionSentiment(questionText = ""): boolean {
  const text = questionText.toLowerCase();

  const positiveIndicators = [
    "supported",
    "respected",
    "listened",
    "valued",
    "appreciated",
    "comfortable",
    "satisfied",
    "happy",
    "motivated",
    "engaged",
    "confident",
    "empowered",
    "recognized",
    "fulfilled",
    "safe",
    "balanced",
    "positive",
    "good",
    "well",
    "energized",
  ];

  const negativeIndicators = [
    "pressure",
    "stress",
    "overwhelmed",
    "anxious",
    "worried",
    "uncomfortable",
    "discomfort",
    "difficulty",
    "problem",
    "issue",
    "conflict",
    "tension",
    "exhausted",
    "burned out",
    "frustrated",
    "isolated",
    "discriminated",
    "harassed",
    "bullied",
    "affect",
  ];

  for (const indicator of negativeIndicators) {
    if (text.includes(indicator)) return false;
  }

  for (const indicator of positiveIndicators) {
    if (text.includes(indicator)) return true;
  }

  return true;
}

function classifyAnswer(
  option = "",
  isPositive?: boolean,
  questionText?: string,
): "red" | "amber" | "green" {
  const text = String(option).toLowerCase().trim();
  const questionIsPositive =
    isPositive ?? detectQuestionSentiment(questionText || "");

  if (
    text.includes("neutral") ||
    text.includes("prefer not") ||
    text.includes("n/a") ||
    text.includes("not applicable") ||
    text.includes("other")
  ) {
    return "amber";
  }

  if (
    text.includes("heavy") ||
    text.includes("severe") ||
    text.includes("major") ||
    text.includes("significant") ||
    text.includes("high") ||
    text.includes("very much") ||
    text.includes("strongly") ||
    text.includes("extremely")
  ) {
    return "red";
  }

  if (
    text.includes("light") ||
    text.includes("minor") ||
    text.includes("slight") ||
    text.includes("low") ||
    text.includes("minimal") ||
    text.includes("not much")
  ) {
    return "green";
  }

  if (
    text.includes("medium") ||
    text.includes("moderate") ||
    text.includes("some") ||
    text.includes("somewhat") ||
    text.includes("mixed") ||
    text.includes("average")
  ) {
    return "amber";
  }

  if (text.includes("yes")) return questionIsPositive ? "green" : "red";

  if (text === "no" || text.startsWith("no ") || text.endsWith(" no")) {
    return questionIsPositive ? "red" : "green";
  }

  return "amber";
}

function classifyResponse(answers: BackendAnswer[]): "red" | "amber" | "green" {
  let hasAmber = false;
  let hasGreen = false;

  for (const answer of answers) {
    const bucket = classifyAnswer(
      answer.option || "",
      answer.isPositive,
      answer.question || "",
    );
    if (bucket === "red") return "red";
    if (bucket === "amber") hasAmber = true;
    if (bucket === "green") hasGreen = true;
  }

  if (hasAmber) return "amber";
  if (hasGreen) return "green";
  return "amber";
}

function deriveThemeLabel(question = "", description = ""): string {
  const text = `${question} ${description}`.toLowerCase();

  if (
    text.includes("stress") ||
    text.includes("pressure") ||
    text.includes("overwhelmed") ||
    text.includes("anxious")
  ) {
    return "Stress and pressure";
  }

  if (
    text.includes("support") ||
    text.includes("listened") ||
    text.includes("valued") ||
    text.includes("appreciated") ||
    text.includes("recognized")
  ) {
    return "Support and recognition";
  }

  if (
    text.includes("safe") ||
    text.includes("conflict") ||
    text.includes("harassed") ||
    text.includes("bullied") ||
    text.includes("discriminated")
  ) {
    return "Workplace safety and culture";
  }

  if (
    text.includes("exhausted") ||
    text.includes("burned out") ||
    text.includes("energized") ||
    text.includes("balance") ||
    text.includes("fatigue")
  ) {
    return "Energy and work-life balance";
  }

  if (
    text.includes("engaged") ||
    text.includes("motivated") ||
    text.includes("fulfilled") ||
    text.includes("confident")
  ) {
    return "Motivation and engagement";
  }

  if (
    text.includes("worried") ||
    text.includes("isolated") ||
    text.includes("happy") ||
    text.includes("wellbeing")
  ) {
    return "Emotional wellbeing";
  }

  return question.trim() || "General wellbeing";
}

function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-GB", opts)} - ${end.toLocaleDateString("en-GB", opts)}`;
}

function buildSummary(
  responses: BackendCheckInResponse[],
  start: Date,
  end: Date,
): SummaryBucket {
  const filtered = responses.filter((item) => {
    const stamp = item.submittedAt || item.createdAt;
    if (!stamp) return false;
    const dt = new Date(stamp);
    return dt >= start && dt <= end;
  });

  let red = 0;
  let amber = 0;
  let green = 0;
  const themeCounts = new Map<string, number>();

  for (const item of filtered) {
    const answers = Array.isArray(item.answers) ? item.answers : [];
    const rag = classifyResponse(answers);
    if (rag === "red") red += 1;
    else if (rag === "amber") amber += 1;
    else green += 1;

    for (const answer of answers) {
      const bucket = classifyAnswer(
        answer.option || "",
        answer.isPositive,
        answer.question || "",
      );
      if (bucket === "green") continue;
      const theme = deriveThemeLabel(answer.question || "", answer.description || "");
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }
  }

  const themes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }));

  return {
    total: filtered.length,
    red,
    amber,
    green,
    themes,
    start: start.toISOString(),
    end: end.toISOString(),
    label: formatWeekLabel(start, end),
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const { ok, payload } = verifyAdminTokenNode(token);
  if (!ok || !payload?.dom) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const currentWeekStart = startOfWeek(new Date());
  const currentWeekEnd = endOfWeek(new Date());
  const oldestNeeded = new Date(currentWeekStart);
  oldestNeeded.setDate(oldestNeeded.getDate() - 21);

  const params = new URLSearchParams({
    domain: payload.dom,
    start: oldestNeeded.toISOString(),
    end: currentWeekEnd.toISOString(),
    limit: "1000",
  });

  try {
    const res = await fetch(`${API_BASE}/checkin-responses?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const message = await res.text();
      return NextResponse.json(
        { ok: false, message: message || "Failed to load dashboard summary." },
        { status: res.status },
      );
    }

    const data = await res.json();
    const responses: BackendCheckInResponse[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];

    const recentWeeks: SummaryBucket[] = [];
    for (let i = 0; i < 4; i += 1) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      recentWeeks.push(buildSummary(responses, start, end));
    }

    return NextResponse.json({
      ok: true,
      domain: payload.dom,
      currentWeek: recentWeeks[0],
      recentWeeks,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to load dashboard summary.",
      },
      { status: 500 },
    );
  }
}
