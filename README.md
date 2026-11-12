# Saulify

**Evidence-first, read-only analysis for public GitHub repositories.**

Saulify reviews a public repository for potential bugs, security issues, quality problems, and architectural risks — then hands you every finding with file/line references, inspectable code evidence, a confidence level, and a copy-ready GitHub issue draft. No account, no installation on the target repo, no code execution.

> **Saulify never modifies repositories, executes repository code, creates issues, or opens pull requests.** It is a review aid: a human reads the evidence and decides what happens next.

---

## Table of Contents

- [What Saulify does](#what-saulify-does)
- [Key features](#key-features)
- [Architecture and analysis workflow](#architecture-and-analysis-workflow)
- [Technology stack](#technology-stack)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation and local development](#installation-and-local-development)
- [Environment variables](#environment-variables)
- [AI provider configuration](#ai-provider-configuration)
  - [Why configure an AI provider?](#why-configure-an-ai-provider)
  - [Connecting a model with an API key](#connecting-a-model-with-an-api-key)
  - [OpenCode Zen](#opencode-zen)
  - [OpenAI-compatible endpoints](#openai-compatible-endpoints)
  - [Google Gemini via its OpenAI-compatible endpoint](#google-gemini-via-its-openai-compatible-endpoint)
  - [Local Ollama](#local-ollama)
  - [Disabling AI review](#disabling-ai-review)
- [Troubleshooting](#troubleshooting)
- [Security and privacy considerations](#security-and-privacy-considerations)
- [Project limitations](#project-limitations)
- [Contributing](#contributing)
- [License](#license)

## What Saulify does

Code review time is scarce, and the bugs that matter — injection-prone patterns, vulnerable dependencies, tangled architecture — hide in files nobody re-reads after the last commit. Saulify addresses this by giving maintainers and reviewers a fast, bounded first pass:

1. **You paste a public GitHub repository URL.** Saulify validates it strictly (only `github.com/{owner}/{repo}`), then reads repository metadata, the default branch, languages, and a capped selection of source files through the GitHub REST API.
2. **Deterministic analyzers run first.** Pattern rules, AST structural checks, code-quality metrics, architecture analysis, and dependency vulnerability lookups produce reproducible findings — no AI required.
3. **An optional AI reviewer adds hypotheses.** If you configure a provider, the model reviews the same selected files under strict prompt-injection defenses, and its output must pass Zod schema validation before anything is shown.
4. **Everything lands in one evidence-backed report.** Findings are deduplicated, labeled by source and severity, and each carries evidence that is checked against the actually fetched source code.

Every finding is either **evidence matched** (the quoted snippet exists verbatim in the fetched file) or an **unverified hypothesis** (plausible, but the quote could not be matched) — the report never blurs that line for you.

## Key features

### Static Security Analysis
Deterministic rules over JavaScript/TypeScript and Python, plus cross-language checks for exposed credentials and private-key blocks. Selected YAML/config files are scanned for credential patterns too. Each hit is anchored to the exact file and line.

### AST Analysis
Structural analysis over supported JS/TS (via the TypeScript compiler API) and Python (via `@lezer/python`) files: unreachable code, unused imports and locals, risky sinks (subprocess, filesystem, SQL string building), and unresolved relative imports — with per-file time and node budgets so large files cannot stall the pipeline.

### Dependency Vulnerability Analysis
Parses npm (`package-lock.json`, `npm-shrinkwrap.json`), pnpm, Yarn, and Python (`requirements.txt`, `pyproject.toml`, poetry exports) manifests, resolves installed versions, and queries the [OSV.dev](https://osv.dev) API in bounded batches. Reports affected packages with advisory references and known fixed versions, and flags declared-but-unused dependencies.

### Code Quality Analysis
Measured, deterministic signals: cyclomatic complexity, nesting depth, function and file size, parameter count, oversized boolean conditions, and exact or renamed duplicate blocks. Findings are labeled **measured** (the number is a fact) versus **advisory** (a recommendation that depends on context).

### Architecture Analysis
Builds a module graph from the selected files and reports circular dependencies, coupling hubs, dependency concentration, inferred layering direction, root/deep-path structure, and mixed ES module/CommonJS usage. Sample-coverage warnings are shown when the analysis covers only part of the repository.

### AI-Powered Analysis
An optional AI reviewer (see [configuration below](#ai-provider-configuration)) reviews up to 8 selected files and returns at most 8 schema-validated findings with severity, confidence, category, evidence, remediation direction, and a ready-to-use GitHub issue title/body. Unknown file paths are discarded, line ranges are clamped, quoted evidence is verified against fetched source, and credential-shaped values are redacted before prompting.

## Architecture and analysis workflow

```
GitHub URL ──► Validate (github.com/{owner}/{repo} only)
                    │
                    ▼
        Fetch metadata, branch, languages, tree
                    │                     (GitHub REST API, 15s timeout)
                    ▼
        Select ≤ 20 source files (risk-prioritized, secrets excluded)
                    │
     ┌──────────────┼───────────────────┬──────────────────┐
     ▼              ▼                   ▼                  ▼
  Static rules   AST analysis     Quality metrics    Dependency check
  (JS/TS, Py)    (TS API, Lezer)  + architecture     (manifests → OSV)
     └──────────────┴─────────┬───────┴──────────────────┘
                              ▼
                Optional AI review (45s budget)
                prompt-injection hardened, Zod-validated,
                evidence verified against fetched source
                              ▼
                Deduplicate, label, sort by severity
                              ▼
                Zod-validated JSON report ──► Browser (sessionStorage)
```

- **Single API route:** `POST /api/analyze` (60-second budget) orchestrates the whole pipeline; the UI is pure client-side rendering of the validated report.
- **Report storage is intentional:** reports live in the browser's `sessionStorage` only. No database, no account, no server-side history.
- **Degraded mode is explicit:** if AI is not configured or fails, the report says so and shows the concrete reason alongside the static findings.

## Technology stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router), React 19 |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4 |
| Schemas & validation | Zod 4 (URL input, AI output, report payload) |
| JS/TS AST | TypeScript compiler API |
| Python AST | [@lezer/python](https://github.com/lezer-parser/python) |
| Dependency data | GitHub REST API, OSV.dev API |
| Testing | Node.js built-in test runner via `tsx` (115 tests) |
| Linting | ESLint 9 with `eslint-config-next` |

## Screenshots

> **Note:** Screenshots are not yet included in this repository. The places below are reserved; until real captures are added, no images are shown rather than fabricated ones.

| Placeholder | What it should show |
| --- | --- |
| `docs/screenshots/landing.png` | Landing page with the repository URL input, example repos, and trust cards |
| `docs/screenshots/report-dashboard.png` | Report header, summary panel, severity/source filters, and finding cards |
| `docs/screenshots/finding-detail.png` | A finding card with severity badge, evidence snippet, and issue draft |

To add real screenshots: capture them, place them under `docs/screenshots/`, and replace the placeholders above with standard `![description](docs/screenshots/...)` references.

## Prerequisites

- **Node.js ≥ 20.9** (required by Next.js 16) and npm
- A public GitHub repository URL to analyze
- Optional: a GitHub personal access token (fine-grained, public-repo read only) for comfortable API quotas
- Optional: an AI provider API key — see [AI provider configuration](#ai-provider-configuration)

## Installation and local development

```bash
# 1. Clone the repository
git clone <your-fork-url> saulify
cd saulify

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a public repository URL, and run an analysis.

The app **works with zero environment variables** — it uses unauthenticated GitHub requests (60 requests/hour, roughly a handful of analyses) and deterministic static analysis only. For regular use, set `GITHUB_TOKEN`, and add an AI provider for richer review.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm test` | Run the full test suite (Node test runner) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |

## Environment variables

All variables are optional. Secrets are read **server-side only** — never prefix them with `NEXT_PUBLIC_`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | No | — | Server-side GitHub token (fine-grained, public-repo read). Raises the REST quota from 60 to 5,000 requests/hour. |
| `MAX_REPO_SIZE_MB` | No | `250` | Reject repositories larger than this many megabytes. |
| `AI_PROVIDER` | No | `auto` | `auto`, `opencode`, `openai-compatible`, `ollama`, or `off`. `openai` is accepted as an alias of `openai-compatible`; `none`/`disabled` as aliases of `off`. |
| `AI_MODEL` | For hosted AI | — | Model identifier for the selected provider (e.g. `qwen2.5-coder:7b`, `gemini-3.6-flash`, or whatever your account offers). |
| `AI_API_KEY` | For OpenAI-compatible | — | Bearer token sent to the OpenAI-compatible endpoint. Also accepted as a fallback key for OpenCode Zen. |
| `AI_BASE_URL` | For OpenAI-compatible | — | Base URL of an OpenAI-compatible API, usually ending in `/v1`. Must be HTTPS unless the host is localhost. |
| `OPENCODE_API_KEY` | For OpenCode Zen | — | Server-side OpenCode Zen API key. |
| `OPENCODE_BASE_URL` | No | `https://opencode.ai/zen/v1` | OpenCode Zen endpoint override. |
| `AI_REASONING_EFFORT` | No | — | `low`, `medium`, or `high`. Sent as `reasoning_effort` to OpenAI-compatible providers. Use `low` when a proxy hides a reasoning model and output gets truncated. Gemini endpoints always use `low`. |
| `OLLAMA_BASE_URL` | For Ollama | `http://127.0.0.1:11434` | Local Ollama server URL. |
| `OLLAMA_MODEL` | For Ollama | — | Local model tag. Accepted as a fallback model name when `AI_MODEL` is unset. |

## AI provider configuration

### Why configure an AI provider?

**AI configuration is optional.** Without it, Saulify still runs its full deterministic pipeline — static security rules, AST analysis, quality metrics, architecture checks, and dependency vulnerability lookups — and produces a complete, evidence-backed report.

What AI adds on top:

- **Hypothesis generation** for issues that need judgment rather than pattern matching: logic slips, misuse-prone APIs, concurrency assumptions, missing validation.
- **Natural-language context** — a clear explanation of *why* something may be a problem and a *suggested direction* for the fix.
- **Ready-to-use GitHub issue drafts** with summary, evidence, impact, and remediation.

Every AI finding is still treated as a **hypothesis**: the output must pass strict Zod validation, quoted evidence is checked against the fetched source before it is labeled "evidence matched", and anything that fails validation is dropped with a warning — the static report is never lost.

Without AI, the report banner reads **"Static analysis only"** and explains what ran. With AI, it shows the provider and model used.

### Connecting a model with an API key

The fastest path for most users is any OpenAI-compatible endpoint:

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-server-side-key
AI_MODEL=gpt-4o-mini
```

Restart `npm run dev` after changing `.env.local`. The next report will show the provider/model in its banner.

### OpenCode Zen

[OpenCode Zen](https://opencode.ai/zen) is a hosted model gateway. Set:

```env
AI_PROVIDER=opencode
OPENCODE_API_KEY=your_server_side_key
AI_MODEL=the_model_identifier_available_to_your_account
```

- `OPENCODE_BASE_URL` defaults to `https://opencode.ai/zen/v1` and rarely needs overriding.
- `AI_API_KEY` is accepted as a fallback if `OPENCODE_API_KEY` is unset.
- Select a model string from the models available to your OpenCode account — availability changes over time and Saulify does not hardcode model names.

### OpenAI-compatible endpoints

Any service that implements `/chat/completions` works:

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your_key
AI_MODEL=model-name
```

- `AI_PROVIDER=openai` is accepted as an alias for `openai-compatible`.
- The API key is sent as an `Authorization: Bearer` header and is optional for endpoints that do not require auth.
- Remote endpoints **must use HTTPS**; plain HTTP is allowed only for `localhost`/`127.0.0.1` (useful for local proxies and Ollama-style servers).
- Requests are non-streaming with `temperature: 0.1` and a bounded output budget; responses larger than 150,000 characters are rejected.

### Google Gemini via its OpenAI-compatible endpoint

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
AI_API_KEY=your_server_side_key
AI_MODEL=gemini-3.6-flash
```

Gemini hosts get special handling in the implementation:

- `reasoning_effort` is forced to `low` (Gemini 3 models always reason; a higher effort consumes most of the response budget within the 45-second AI timeout).
- `max_tokens` is raised to 8,192 for the structured JSON review.
- Prefer a model that is currently available in your region — capacity-limited models can return `503` or exceed the timeout.

### Local Ollama

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
AI_MODEL=qwen2.5-coder:7b
```

- No API key is required; requests go to the local chat API (`/api/chat`) with `format: json`.
- `OLLAMA_MODEL` works as a model-name alias if `AI_MODEL` is unset.
- If Saulify runs in a container, `127.0.0.1` points at the container, not your host — use `host.docker.internal` or your LAN address instead.
- Code-focused local models in the 7B+ range give the best results.

### Disabling AI review

```env
AI_PROVIDER=off
```

`none` and `disabled` are accepted aliases. Omitting all provider configuration has the same effect: **static analysis only**.

### How provider selection works (`AI_PROVIDER=auto`)

With the default `auto` value, Saulify picks the **first complete** configuration:

1. **OpenCode Zen** — if `OPENCODE_API_KEY` (or `AI_API_KEY`) and a model are set
2. **OpenAI-compatible** — if `AI_BASE_URL` and a model are set
3. **Ollama** — if `OLLAMA_BASE_URL` and a model are set
4. Otherwise — static analysis only

Setting `AI_PROVIDER` explicitly pins one path and produces a precise error if that configuration is incomplete (shown in the report banner, never a crash).

## Troubleshooting

The report banner and warnings carry the concrete provider error — start there.

**GitHub rate limits (`github_rate_limit`, HTTP 429)**
Unauthenticated GitHub traffic allows 60 requests/hour, which a few analyses will exhaust. Set a server-side `GITHUB_TOKEN` (fine-grained, public-repo read). The report shows when the quota resets.

**"Repository not found"**
Private repositories are not supported. Make sure the repository is public and the URL points at the repository root.

**Invalid endpoint configuration**
`AI base URL must use HTTP or HTTPS` / `Use HTTPS for remote AI endpoints` — remote endpoints must be HTTPS; plain HTTP is only accepted for localhost. URLs containing credentials are always rejected.

**Missing key or model**
Selecting a provider without its required variables produces e.g. `OpenCode AI is selected but OPENCODE_API_KEY or AI_MODEL is missing.` The analysis still completes with static findings.

**Model errors (`AI provider returned HTTP 429/503/...`)**
HTTP 429 means the provider's rate limit or free-tier quota is exhausted — wait for the window to reset, use a paid key, or switch providers. HTTP 503 from capacity-limited models (e.g. `gemini-3.8-flash`) usually clears on retry or with a different model.

**`User location is not supported` (Gemini)**
Google blocks Gemini API access from some regions. Changing the model will not fix it — use an accessible provider endpoint or a local Ollama model. Static analysis works regardless.

**Truncated or rejected AI output**
Reasoning models behind proxies spend output tokens on hidden thinking. Set `AI_REASONING_EFFORT=low`. Rejected output never breaks the report — it is dropped with a warning (`AI output was rejected: ...`) and static findings are kept.

**AI timeouts**
AI calls time out after 45 seconds (`AI provider timed out.`). Larger repositories and slower models can exceed this; try a smaller repo or a faster model. The whole API route is capped at 60 seconds.

**Static fallback**
Every AI failure path — no configuration, invalid configuration, network errors, malformed output, timeout, refusal — leaves the deterministic report intact and states exactly what went wrong in the report warnings.

## Security and privacy considerations

- **No execution:** source is only fetched and parsed as text. Saulify does not install dependencies, run scripts, run builds, invoke package lifecycle hooks, or execute repository code.
- **SSRF resistant:** the only user-controlled input is parsed as an exact `github.com/{owner}/{repo}` pair; API URLs are rebuilt from that pair. Other hosts, ports, credentials, query strings, and nested paths are rejected.
- **Quota and resource caps:** 20 selected files, 120K characters per file, 250 MB repository size by default, 58K characters of AI context, bounded parallel GitHub fetches, and per-request timeouts.
- **Prompt-injection defense:** repository text is delimited as untrusted data, the model is instructed to ignore embedded instructions, credential-shaped values and private-key blocks are redacted before prompting, unknown file paths are discarded, and output is schema-validated.
- **Secret hygiene:** `.env` files and common credential files are excluded from file selection; detected secrets are redacted in evidence; API keys are read only on the server and never sent to the browser.
- **Safe rendering:** findings and issue drafts are rendered as text, never as HTML.
- **Abuse control:** five analyses per 10 minutes per instance/IP. This is best-effort in-memory limiting — use a distributed rate limiter (Redis/Upstash) in multi-instance deployments.
- **Read-only product:** no GitHub write scopes are needed; Saulify cannot create issues or comments.
- **AI data flow:** when AI review is enabled, selected file contents (with secrets redacted) are sent to the configured AI provider. Don't configure a provider you don't trust with that content, or run with AI disabled.

## Project limitations

- Static analysis is a curated set of pattern rules, not full data-flow analysis or the repository's own ESLint configuration. It can miss issues and can produce false positives.
- Code-quality thresholds are heuristics. A measured signal is deterministic, but whether it deserves a change depends on the module's role and the maintainers' standards.
- Architecture analysis uses the selected source sample. Layer and structure findings are advisory, and cycle or coupling results can omit modules outside the sample.
- Only a ranked subset of compatible source files is inspected (maximum 20).
- AI findings are hypotheses. "Evidence matched" means the quoted snippet exists in the fetched source — not that the issue is exploitable.
- Private repositories, monorepos above the size cap, binary files, generated/vendored code, and unsupported languages are not analyzed.
- Repository tests are not executed; runtime behavior and git history are not evaluated.
- Reports live in the browser session only — sharing a report URL or opening it elsewhere shows a "report no longer available" state. Persistent storage is intentionally out of scope.
- GitHub issue drafts are suggestions and must be reviewed and submitted manually.
- The in-memory rate limiter protects one instance only.

## Contributing

Contributions are welcome!

1. Fork the repository and create a branch.
2. `npm install`, then `npm run dev` to work locally.
3. Before opening a PR, run the checks:

   ```bash
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```

4. Keep PRs focused; if you touch the analyzers, add or extend tests in `tests/`. Preserve the read-only, no-execution safety model in any change.

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.
