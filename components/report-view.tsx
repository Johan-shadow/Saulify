"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Finding, Report, Severity } from "@/lib/reports/schema";
import { CopyButton } from "@/components/copy-button";
import { dictionary as t } from "@/lib/i18n";
import {
  AlertIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  GitHubIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const SOURCE_ORDER: Finding["source"][] = ["static", "ast", "quality", "dependency", "ai"];

const SOURCE_DOT: Record<Finding["source"], string> = {
  ai: "bg-violet-300",
  static: "bg-lime-300",
  ast: "bg-cyan-300",
  quality: "bg-teal-300",
  dependency: "bg-rose-300",
};

const SEVERITY_STYLES: Record<Severity, { badge: string; edge: string; stat: string }> = {
  critical: {
    badge: "border-red-400/25 bg-red-400/10 text-red-300",
    edge: "bg-red-400/60",
    stat: "text-red-300",
  },
  high: {
    badge: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    edge: "bg-orange-400/60",
    stat: "text-orange-300",
  },
  medium: {
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    edge: "bg-amber-300/60",
    stat: "text-amber-200",
  },
  low: {
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    edge: "bg-sky-400/60",
    stat: "text-sky-300",
  },
};

const CONFIDENCE_STYLES = {
  high: "text-emerald-300",
  medium: "text-amber-200",
  low: "text-zinc-400",
} as const;

function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(value);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${formatNumber(milliseconds)}ms`;
  return `${formatNumber(milliseconds / 1_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function referenceLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function FindingCard({ finding, issuesUrl }: { finding: Finding; issuesUrl: string }) {
  const location = finding.file
    ? `${finding.file}${finding.startLine ? `:${finding.startLine}${finding.endLine && finding.endLine !== finding.startLine ? `–${finding.endLine}` : ""}` : ""}`
    : t.report.finding.repositoryWide;
  const severity = SEVERITY_STYLES[finding.severity];

  return (
    <article
      id={finding.id}
      className="finding-card relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0e0c]/80 transition hover:border-white/[0.14]"
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${severity.edge}`} aria-hidden="true" />
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${severity.badge}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {t.report.severities[finding.severity]}
          </span>
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-zinc-400">
            {t.report.categories[finding.category]}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
            <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[finding.source]}`} />
            {t.report.source[finding.source]}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
              finding.evidenceStatus === "verified"
                ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
                : "border-white/10 bg-white/[0.03] text-zinc-400"
            }`}
          >
            {finding.evidenceStatus === "verified" && (
              <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m1.5 5.5 2 2 5-5" />
              </svg>
            )}
            {t.report.evidenceStatus[finding.evidenceStatus]}
          </span>
          {finding.assessment && (
            <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.07] px-2 py-0.5 text-[10px] text-teal-200">
              {t.report.assessment[finding.assessment]}
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold leading-6 tracking-tight text-zinc-100 sm:text-lg">
          {finding.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="font-mono text-lime-200/80" title={location}>
            {location}
          </span>
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <span className="text-zinc-500">
            {t.report.confidence.label}{" "}
            <span className={`font-medium ${CONFIDENCE_STYLES[finding.confidence]}`}>{t.report.confidence[finding.confidence]}</span>
          </span>
        </div>
        {finding.relatedLocations && finding.relatedLocations.length > 0 && (
          <div className="mt-2.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              {t.report.finding.relatedLocations}
            </div>
            <ul className="mt-1 space-y-0.5">
              {finding.relatedLocations.map((related) => (
                <li
                  key={`${related.file}:${related.startLine}:${related.endLine}`}
                  className="font-mono text-[11px] text-zinc-500"
                >
                  {related.file}:{related.startLine}
                  {related.endLine !== related.startLine ? `–${related.endLine}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {finding.dependency && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <span className="rounded border border-rose-300/15 bg-rose-300/[0.05] px-1.5 py-0.5 text-rose-200/80">
              {finding.dependency.ecosystem}
            </span>
            <span className="break-all">
              {finding.dependency.name}
              {finding.dependency.installedVersion
                ? `@${finding.dependency.installedVersion}`
                : finding.dependency.declaredRange
                  ? ` ${finding.dependency.declaredRange}`
                  : ""}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t.report.finding.what}
          </h3>
          <p className="text-sm leading-6 text-zinc-300">{finding.explanation}</p>
        </div>

        {finding.evidence && (
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t.report.finding.evidence}
            </h3>
            <pre className="max-h-56 overflow-auto rounded-xl border border-white/[0.07] bg-black/40 p-3 font-mono text-[11px] leading-5 text-zinc-300">
              <code>{finding.evidence}</code>
            </pre>
          </div>
        )}

        <div className="grid gap-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <span className="h-1 w-1 rounded-full bg-amber-300/70" aria-hidden="true" />
              {t.report.finding.why}
            </h3>
            <p className="text-xs leading-6 text-zinc-400">{finding.whyProblematic}</p>
          </div>
          <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <span className="h-1 w-1 rounded-full bg-lime-300/70" aria-hidden="true" />
              {t.report.finding.suggested}
            </h3>
            <p className="text-xs leading-6 text-zinc-400">{finding.suggestedFix}</p>
          </div>
        </div>

        {finding.references && finding.references.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t.report.finding.references}
            </h3>
            <ul className="space-y-1.5">
              {finding.references.map((reference) => (
                <li key={reference}>
                  <a
                    href={reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-start gap-1.5 font-mono text-[11px] text-sky-300/80 transition hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    <ExternalLinkIcon className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="break-all">{referenceLabel(reference)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="group rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-xs font-medium text-zinc-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">
            <span className="flex items-center gap-2">
              <GitHubIcon className="h-3.5 w-3.5 text-zinc-500" />
              {t.report.finding.draft}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-zinc-600 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/[0.06] px-3.5 py-3.5">
            <div className="mb-2 flex flex-wrap gap-2">
              <CopyButton text={finding.issue.title} label={t.report.finding.copyTitle} copiedLabel={t.common.copied} />
              <CopyButton
                text={finding.issue.body}
                label={t.report.finding.copyDescription}
                copiedLabel={t.common.copied}
              />
              <a
                href={issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
              >
                {t.report.finding.openIssues}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
            <p className="mb-1 mt-3 text-[11px] font-medium text-zinc-300">{finding.issue.title}</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-[10px] leading-5 text-zinc-400">
              {finding.issue.body}
            </pre>
          </div>
        </details>
      </div>
    </article>
  );
}

export function ReportView({ report }: { report: Report }) {
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [source, setSource] = useState<Finding["source"] | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const counts = useMemo(() => {
    const base: Record<Severity | "all", number> = { all: report.findings.length, critical: 0, high: 0, medium: 0, low: 0 };
    for (const finding of report.findings) base[finding.severity]++;
    return base;
  }, [report.findings]);

  const sourceCounts = useMemo(() => {
    const base: Record<Finding["source"] | "all", number> = {
      all: report.findings.length,
      static: 0,
      ast: 0,
      quality: 0,
      dependency: 0,
      ai: 0,
    };
    for (const finding of report.findings) base[finding.source]++;
    return base;
  }, [report.findings]);

  const verifiedCount = report.findings.filter((finding) => finding.evidenceStatus === "verified").length;
  const hypothesisCount = report.findings.length - verifiedCount;

  const visible = report.findings.filter(
    (finding) =>
      (severity === "all" || finding.severity === severity) &&
      (source === "all" || finding.source === source) &&
      (!verifiedOnly || finding.evidenceStatus === "verified"),
  );

  const localizedSummary = t.report.summary({
    total: formatNumber(report.findings.length),
    files: formatNumber(report.stats.filesAnalyzed),
    critical: formatNumber(counts.critical),
    high: formatNumber(counts.high),
    medium: formatNumber(counts.medium),
    low: formatNumber(counts.low),
    verified: formatNumber(verifiedCount),
    hypotheses: formatNumber(hypothesisCount),
    ai: report.mode.ai,
  });

  const aiFailureReason = report.warnings
    .find((warning) => warning.startsWith("AI review failed: ") || warning.startsWith("AI output was rejected: "))
    ?.replace(/^AI (?:review failed|output was rejected): /, "");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070908]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-lime-300/[0.05] to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" aria-hidden="true" />

      <header className="relative z-20 border-b border-white/[0.07] bg-[#070908]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
              <ShieldIcon className="h-4 w-4" />
            </span>
            Saulify
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={report.repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:inline-flex"
            >
              {t.common.repository}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href={report.repo.issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            >
              <GitHubIcon className="h-3.5 w-3.5" />
              {t.common.issues}
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
            <Link
              href="/"
              className="rounded-lg bg-lime-300 px-3 py-1.5 text-xs font-semibold text-[#10150d] transition hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            >
              {t.common.newAnalysis}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-col justify-between gap-6 border-b border-white/[0.07] pb-8 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              <span className="h-1 w-1 rounded-full bg-lime-300" />
              {t.report.eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-all text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {report.repo.fullName}
              </h1>
              {report.repo.archived && (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] text-amber-200">
                  {t.report.archived}
                </span>
              )}
            </div>
            {report.repo.description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{report.repo.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tabular-nums text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                <span className="font-mono">{report.repo.defaultBranch}</span>
              </span>
              <span>★ {formatNumber(report.repo.stars)}</span>
              <span>{t.report.forks(formatNumber(report.repo.forks))}</span>
              {report.repo.license && <span className="font-mono">{report.repo.license}</span>}
              <span>{t.report.analysisTime(formatDuration(report.stats.durationMs))}</span>
              <span>{formatDate(report.generatedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {report.languages.map((language) => (
              <span
                key={language.name}
                className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[10px] text-zinc-400"
              >
                {language.name}{" "}
                <span className="text-zinc-600">{formatNumber(language.percentage)}%</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div
            className={`flex flex-1 gap-3 rounded-xl border px-4 py-3 text-xs leading-5 ${
              report.mode.ai
                ? "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-100/80"
                : "border-amber-300/15 bg-amber-300/[0.035] text-amber-100/70"
            }`}
          >
            {report.mode.ai ? (
              <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            )}
            <div>
              <span className="font-medium text-zinc-200">
                {report.mode.ai ? t.report.mode.ai : t.report.mode.static}
              </span>
              {report.mode.model && (
                <span className="ml-2 font-mono text-[10px] text-zinc-500">
                  {report.mode.provider} / {report.mode.model}
                  {!report.mode.ai && <span className="ml-1 text-zinc-600">({t.report.mode.notUsed})</span>}
                </span>
              )}
              <p className="mt-0.5 text-zinc-500">
                {report.mode.ai
                  ? report.mode.note
                  : aiFailureReason
                    ? t.report.mode.failure(aiFailureReason)
                    : t.report.mode.staticNote}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">{t.report.files}</div>
              <div className="mt-0.5 font-mono text-sm tabular-nums text-zinc-200">
                {formatNumber(report.stats.filesAnalyzed)}
                <span className="text-zinc-600">/{formatNumber(report.stats.filesSelected)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">{t.report.evidence}</div>
              <div className="mt-0.5 font-mono text-sm tabular-nums text-zinc-200">
                {formatNumber(verifiedCount)}
                <span className="text-zinc-600">/{formatNumber(report.findings.length)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">{t.report.reviewSummary}</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">{localizedSummary}</p>
                </div>
                <div className="flex gap-1.5">
                  {SEVERITY_ORDER.map((level) => (
                    <div
                      key={level}
                      className="min-w-12 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5 text-center"
                    >
                      <div className={`text-sm font-semibold tabular-nums ${SEVERITY_STYLES[level].stat}`}>
                        {formatNumber(counts[level])}
                      </div>
                      <div className="text-[8px] uppercase tracking-wider text-zinc-600">{t.report.severities[level]}</div>
                    </div>
                  ))}
                </div>
              </div>
              {report.findings.length > 0 && (
                <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-5 text-zinc-600">
                  {t.report.evidenceLine(
                    formatNumber(verifiedCount),
                    formatNumber(hypothesisCount),
                  )}
                </p>
              )}
            </div>

            {report.warnings.length > 0 && (
              <details className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">
                  <span className="flex items-center gap-2">
                    <AlertIcon className="h-3.5 w-3.5 text-amber-300/70" />
                    {t.report.warnings(formatNumber(report.warnings.length))}
                  </span>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-600" />
                </summary>
                <ul className="space-y-1.5 border-t border-white/[0.06] px-4 py-3 text-[11px] leading-5 text-zinc-500">
                  {report.warnings.map((warning, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-zinc-700" aria-hidden="true">–</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="sticky top-0 z-10 -mx-1 mt-7 rounded-lg bg-[#070908]/90 px-1 py-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", ...SEVERITY_ORDER] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    aria-pressed={severity === level}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${
                      severity === level
                        ? "border-lime-300/30 bg-lime-300/[0.12] text-lime-200"
                        : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                    }`}
                  >
                    {t.report.filters[level]}{" "}
                    <span className="ml-0.5 tabular-nums opacity-60">{formatNumber(counts[level])}</span>
                  </button>
                ))}
                {hypothesisCount > 0 && (
                  <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(event) => setVerifiedOnly(event.target.checked)}
                      className="h-3.5 w-3.5 accent-lime-300"
                    />
                    {t.report.filters.verifiedOnly}
                  </label>
                )}
              </div>
              {report.findings.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {(["all", ...SOURCE_ORDER] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSource(value)}
                      aria-pressed={source === value}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${
                        source === value
                          ? "border-white/20 bg-white/[0.08] text-zinc-200"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                      }`}
                    >
                      {value !== "all" && (
                        <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[value]}`} />
                      )}
                      {value === "all" ? t.report.filters.allSources : t.report.source[value]}{" "}
                      <span className="tabular-nums opacity-60">{formatNumber(sourceCounts[value])}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 space-y-3">
              {visible.length > 0 ? (
                visible.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} issuesUrl={report.repo.issuesUrl} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-white/[0.08] bg-white/[0.02] text-zinc-600">
                    <FileCodeIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3.5 text-sm font-medium text-zinc-300">
                    {report.findings.length === 0 ? t.report.noIssues : t.report.noMatches}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">
                    {report.findings.length === 0 ? t.report.noIssuesDescription : t.report.noMatchesDescription}
                  </p>
                  {(severity !== "all" || source !== "all" || verifiedOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeverity("all");
                        setSource("all");
                        setVerifiedOnly(false);
                      }}
                      className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
                    >
                      {t.report.clearFilters}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.035] p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                <GitHubIcon className="h-3.5 w-3.5 text-lime-300" />
                {t.report.submit.title}
              </h2>
              <ol className="mt-3 space-y-3 text-[11px] leading-5 text-zinc-400">
                <li className="flex gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-lime-300/25 font-mono text-[9px] text-lime-200">1</span>
                  <span>
                    {t.report.submit.step1Prefix}{" "}
                    <span className="font-medium text-zinc-200">{t.report.submit.step1Action}</span>
                    {t.report.submit.step1Suffix}
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-lime-300/25 font-mono text-[9px] text-lime-200">2</span>
                  {t.report.submit.step2}
                </li>
                <li className="flex gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-lime-300/25 font-mono text-[9px] text-lime-200">3</span>
                  {t.report.submit.step3}
                </li>
                <li className="flex gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-lime-300/25 font-mono text-[9px] text-lime-200">4</span>
                  {t.report.submit.step4}
                </li>
              </ol>
              <a
                href={report.repo.issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-lime-300/25 bg-lime-300/[0.08] px-3 py-2 text-[11px] font-medium text-lime-200 transition hover:bg-lime-300/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
              >
                {t.report.submit.open}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t.report.coverage.title}</h2>
              <dl className="mt-3 space-y-2 text-[11px]">
                {[
                  [t.report.coverage.treeEntries, formatNumber(report.stats.treeEntries)],
                  [t.report.coverage.filesSelected, formatNumber(report.stats.filesSelected)],
                  [t.report.coverage.filesAnalyzed, formatNumber(report.stats.filesAnalyzed)],
                  [t.report.coverage.treeTruncated, report.stats.treeTruncated ? t.report.coverage.yes : t.report.coverage.no],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-600">{label}</dt>
                    <dd className="font-mono tabular-nums text-zinc-300">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
              <p className="text-[10px] leading-5 text-zinc-600">{t.report.disclaimer}</p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-2 px-5 py-6 text-[10px] text-zinc-600 sm:flex-row sm:px-8">
          <span>{t.report.footerLeft}</span>
          <span>{t.report.footerRight}</span>
        </div>
      </footer>
    </div>
  );
}
