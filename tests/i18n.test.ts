import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { dictionary } from "../lib/i18n";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

test("dictionary exposes every UI section", () => {
  assert.equal(dictionary.features.capabilities.length, 4);
  assert.deepEqual(
    dictionary.features.capabilities.map((capability) => capability.points.length),
    [3, 3, 3, 3],
  );
  assert.equal(dictionary.home.steps.length, 6);
  assert.equal(dictionary.home.how.cards.length, 3);
  assert.equal(dictionary.home.trust.length, 3);
  assert.ok(dictionary.report.summary, "report summary renderer is required");
  assert.ok(dictionary.report.footerLeft.includes("Saulify"));
});

test("dictionary covers every API error code the server can return", () => {
  const apiRouteCodes = [
    "rate_limited",
    "body_too_large",
    "invalid_body",
    "invalid_json",
    "invalid_input",
    "internal_error",
  ];
  const githubCodes = [
    "invalid_url",
    "repo_not_found",
    "github_rate_limit",
    "github_auth",
    "github_forbidden",
    "repo_unavailable",
    "github_timeout",
    "github_aborted",
    "github_unreachable",
    "github_error",
    "github_payload",
    "response_too_large",
    "file_too_large",
    "repo_too_large",
  ];

  for (const code of [...apiRouteCodes, ...githubCodes]) {
    assert.ok(dictionary.home.apiErrors[code], `missing user-facing copy for error code "${code}"`);
  }
});

test("summary renders correct pluralization and analysis layers", () => {
  const single = dictionary.report.summary({
    total: "1",
    files: "4",
    critical: "0",
    high: "1",
    medium: "0",
    low: "0",
    verified: "1",
    hypotheses: "0",
    ai: false,
  });
  const multiple = dictionary.report.summary({
    total: "3",
    files: "9",
    critical: "1",
    high: "1",
    medium: "1",
    low: "0",
    verified: "2",
    hypotheses: "1",
    ai: true,
  });

  assert.match(single, /Found 1 potential issue across 4 analyzed files/);
  assert.match(single, /deterministic static rules, AST structural analysis, code quality and architecture analysis, and dependency vulnerability analysis/);
  assert.match(multiple, /Found 3 potential issues across 9 analyzed files/);
  assert.match(multiple, /validated AI review/);
  assert.match(multiple, /2 findings have source-matched evidence/);
  assert.match(multiple, /1 remains an unverified hypothesis/);
});

test("application source stays English-only with no Persian text", () => {
  const roots = ["app", "components", "lib"].map((directory) => join(process.cwd(), directory));
  const offenders = roots
    .flatMap(sourceFiles)
    .filter((path) => /[\u0600-\u06FF]/.test(readFileSync(path, "utf8")))
    .map((path) => relative(process.cwd(), path));

  assert.deepEqual(offenders, []);
});
