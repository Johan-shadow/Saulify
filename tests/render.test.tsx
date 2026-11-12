import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "../components/report-view";
import { FeaturesView } from "../components/features-view";
import { Onboarding } from "../components/onboarding";
import type { Report } from "../lib/reports/schema";

function reportWith(title = "Potential hardcoded credential"): Report {
  return {
    version: 1,
    id: "report-test",
    generatedAt: "2026-10-24T12:00:00.000Z",
    repo: {
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      htmlUrl: "https://github.com/owner/repo",
      issuesUrl: "https://github.com/owner/repo/issues",
      description: "A test repository",
      defaultBranch: "main",
      stars: 10,
      forks: 2,
      sizeKb: 1000,
      license: "MIT",
      archived: false,
      pushedAt: "2026-10-20T00:00:00.000Z",
    },
    languages: [{ name: "TypeScript", percentage: 100 }],
    mode: {
      ai: false,
      provider: "none",
      model: null,
      note: "No AI provider is configured. Static analysis still runs.",
    },
    stats: {
      treeEntries: 20,
      filesSelected: 10,
      filesAnalyzed: 10,
      filesSkipped: 10,
      treeTruncated: false,
      durationMs: 1234,
    },
    warnings: [],
    summary: "Found 1 potential issue.",
    findings: [
      {
        id: "static-test",
        source: "static",
        evidenceStatus: "verified",
        severity: "high",
        confidence: "medium",
        category: "security",
        title,
        explanation: "A credential-shaped value is committed.",
        file: "src/config.ts",
        startLine: 12,
        endLine: 12,
        evidence: 'const apiKey = "[REDACTED]";',
        whyProblematic: "The credential may be recoverable from repository history.",
        suggestedFix: "Rotate the value and load it from the server environment.",
        issue: {
          title: "[high] Potential hardcoded credential in src/config.ts",
          body: "## Summary\nA credential-shaped value is committed.",
        },
      },
    ],
  };
}

test("report renders evidence, filters, issue copy controls, and manual steps", () => {
  const html = renderToStaticMarkup(<ReportView report={reportWith()} />);

  assert.match(html, /owner\/repo/);
  assert.match(html, /Potential hardcoded credential/);
  assert.match(html, /src\/config\.ts/);
  assert.match(html, /Evidence matched/);
  assert.match(html, /Copy title/);
  assert.match(html, /Copy description/);
  assert.match(html, /Open GitHub Issues/);
  assert.match(html, /Saulify never creates issues or comments/);
  assert.match(html, /Static analysis only/);
});

test("report renders dependency findings with package metadata, references, and a source filter", () => {
  const report = reportWith();
  report.findings.push({
    id: "dependency-test",
    source: "dependency",
    evidenceStatus: "verified",
    severity: "critical",
    confidence: "high",
    category: "security",
    title: "Vulnerable dependency: lodash@4.17.20 (GHSA-test-1234)",
    explanation: "Prototype pollution in lodash.",
    file: "package-lock.json",
    startLine: null,
    endLine: null,
    evidence: "Advisory: GHSA-test-1234\nInstalled: 4.17.20\nFixed: 4.17.21",
    whyProblematic: "The lockfile resolves an affected version.",
    suggestedFix: "Upgrade lodash and regenerate the lockfile.",
    dependency: {
      ecosystem: "npm",
      name: "lodash",
      installedVersion: "4.17.20",
      declaredRange: "^4.17.20",
      manifest: "package-lock.json",
    },
    references: ["https://osv.dev/vulnerability/GHSA-test-1234"],
    issue: {
      title: "[critical] Vulnerable dependency: lodash@4.17.20",
      body: "## Summary\nPrototype pollution in lodash.",
    },
  });

  const html = renderToStaticMarkup(<ReportView report={report} />);

  assert.match(html, /Dependency check/);
  assert.match(html, /All sources/);
  assert.match(html, /lodash@4\.17\.20/);
  assert.match(html, /References/);
  assert.match(html, /https:\/\/osv\.dev\/vulnerability\/GHSA-test-1234/);
});

test("report renders quality architecture findings with assessment and related locations", () => {
  const report = reportWith("Circular module dependency");
  report.findings[0] = {
    ...report.findings[0],
    id: "quality-test",
    source: "quality",
    category: "architecture",
    assessment: "measured",
    confidence: "high",
    title: "Circular module dependency",
    file: "src/a.ts",
    startLine: 3,
    endLine: 3,
    relatedLocations: [{ file: "src/b.ts", startLine: 4, endLine: 8 }],
    issue: {
      title: "[medium] Circular module dependency in src/a.ts",
      body: "## Summary\nA cycle was measured.",
    },
  };

  const html = renderToStaticMarkup(<ReportView report={report} />);

  assert.match(html, /Quality &amp; architecture/);
  assert.match(html, /Measured signal/);
  assert.match(html, /Architecture/);
  assert.match(html, /Related locations/);
  assert.match(html, /src\/b\.ts:4–8/);
});

test("report exposes the AI failure reason and marks the configured model as unused", () => {
  const report = reportWith();
  report.mode = {
    ai: false,
    provider: "OpenAI-compatible endpoint",
    model: "gemini-3.6-flash",
    note: "AI review was configured but unavailable.",
  };
  report.warnings = ["AI review failed: AI provider timed out."];

  const html = renderToStaticMarkup(<ReportView report={report} />);

  assert.match(html, /not used/);
  assert.match(html, /AI review could not complete: AI provider timed out/);
  assert.match(html, /gemini-3\.6-flash/);
});

test("report escapes repository and finding text instead of rendering HTML", () => {
  const html = renderToStaticMarkup(<ReportView report={reportWith("<script>alert(1)</script>")} />);
  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("features page renders all four capabilities and the replay control", () => {
  const html = renderToStaticMarkup(<FeaturesView />);

  assert.match(html, /Security Analysis/);
  assert.match(html, /Code Quality/);
  assert.match(html, /Architecture Analysis/);
  assert.match(html, /AI-Powered Insights/);
  assert.match(html, /Replay the tour/);
  assert.match(html, /Analyze a repository/);
  assert.match(html, /id="capability-0"/);
  assert.match(html, /id="capability-3"/);
});

test("onboarding starts on the first capability with progress and controls", () => {
  const html = renderToStaticMarkup(<Onboarding />);

  assert.match(html, /Product tour/);
  assert.match(html, /Security Analysis/);
  assert.match(html, /1 \/ 4/);
  assert.match(html, /Skip/);
  assert.match(html, /Previous/);
  assert.match(html, /Next/);
});
