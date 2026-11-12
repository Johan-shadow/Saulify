"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reportSchema, type Report } from "@/lib/reports/schema";
import { ReportView } from "@/components/report-view";
import { dictionary as t } from "@/lib/i18n";
import { AlertIcon, ShieldIcon } from "@/components/icons";

type State = { status: "loading" } | { status: "ready"; report: Report } | { status: "missing" };

export function ReportClient({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(`saulify:report:${id}`);
        if (!raw) {
          setState({ status: "missing" });
          return;
        }
        const parsed = reportSchema.safeParse(JSON.parse(raw));
        if (!parsed.success || parsed.data.id !== id) {
          setState({ status: "missing" });
          return;
        }
        setState({ status: "ready", report: parsed.data });
      } catch {
        setState({ status: "missing" });
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 bg-[#070908] px-5">
        <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" aria-hidden="true" />
        <span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
          <ShieldIcon className="h-5 w-5" />
        </span>
        <div className="relative flex items-center gap-2.5 text-xs text-zinc-500" role="status" aria-live="polite">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-lime-300" aria-hidden="true" />
          {t.report.loading}
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#070908] px-5">
        <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" aria-hidden="true" />
        <div className="relative max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 text-center shadow-2xl shadow-black/40">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
            <AlertIcon className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-white">{t.report.missingTitle}</h1>
          <p className="mt-2.5 text-xs leading-6 text-zinc-500">{t.report.missingDescription}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-lime-300 px-4 py-2 text-xs font-semibold text-[#10150d] transition hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            {t.report.startNew}
          </Link>
        </div>
      </div>
    );
  }

  return <ReportView report={state.report} />;
}
