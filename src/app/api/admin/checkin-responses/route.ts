export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminTokenNode } from "@/lib/adminAuthNode";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type BackendCheckInResponse = {
  _id: string;
  employeeId?: string;
  domain: string;
  answers?: {
    questionId: string;
    question: string;
    option: string;
    description: string;
    isPositive?: boolean;
  }[];
  submittedAt: string;
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const { ok, payload } = verifyAdminTokenNode(token);
  if (!ok || !payload?.dom) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams({ domain: payload.dom });

  try {
    const res = await fetch(`${API_BASE}/checkin-responses?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const message = await res.text();
      return NextResponse.json(
        { ok: false, message: message || "Failed to load responses." },
        { status: res.status },
      );
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    const sanitized = items.map((item: BackendCheckInResponse) => ({
      _id: item._id,
      domain: item.domain,
      answers: Array.isArray(item.answers) ? item.answers : [],
      submittedAt: item.submittedAt,
    }));

    return NextResponse.json({ ok: true, items: sanitized });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load responses.",
      },
      { status: 500 },
    );
  }
}
