# CaseForge — AI case-writing assistant for Public Forum debate

CaseForge helps debaters **draft, format, and refine** a Public Forum (PF)
constructive speech — the way academic-writing sites help students write essays.
You write your case in a guided, structured editor (framework, definitions,
contentions), and an AI coach gives topic-aware feedback on **wording, clarity,
persuasion, tone, and argument logic** — or rewrites a passage to sound more
authentic and convincing.

> Working name. "CaseForge" is a placeholder — rename freely.

---

## What it does (product scope)

**The structured editor (v1 core)**
- Guided sections for a PF constructive: **Framework**, **Definitions**, and
  **Contentions** broken into *Claim → Warrant → Evidence → Impact*.
- Live formatting and word/time estimates (a PF constructive is ~3–4 min ≈
  650–800 words) so writers stay within speech limits.
- One-click **export** to a clean printable/read-aloud format (Markdown, plain
  text, and a "speech doc" view). Work is saved in the browser — no login.

**The AI coach (next phase — see [ROADMAP](docs/ROADMAP.md))**
- **Writing & wording feedback** — clarity, grammar, flow, filler, word choice.
- **Persuasion & authenticity** — makes a passage more convincing and natural,
  and can match a chosen **debate tone** (e.g. measured/analytical vs.
  punchy/rhetorical).
- **Argument feedback** — warrant strength, link chains, impact logic, and
  where evidence is thin — tuned to the specific resolution/topic.

The AI is delivered per *section* and per *selection*, so feedback is targeted
("tighten this warrant") rather than one giant dump.

## What it deliberately does **not** do

CaseForge is a **coaching and formatting** tool, not a case-generation machine.
It will not write a full case from a one-line prompt or fabricate evidence.
See [Content & Integrity Policy](docs/CONTENT_AND_INTEGRITY_POLICY.md) for the
reasoning and the guardrails.

---

## How it's built (at a glance)

- **Frontend:** static site (fast, cheap, host-anywhere) with the editor as a
  client-side app. Can be showcased/linked from the existing portfolio site.
- **Backend:** thin **serverless functions** that hold the AI provider key and
  proxy requests. The key never touches the browser.
- **AI:** a **model-agnostic adapter** so we can plug in DeepSeek (V3 / R1 /
  whatever is current) or any other provider without rewriting the app.
- **Data:** login-free v1 — cases live in the browser (`localStorage`) plus
  file export. Accounts + cloud sync are a later, optional phase.

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Note on "DeepSeek V4":** as of this writing DeepSeek's released line is
> **V3** and **R1** — there is no public "V4." The adapter is designed so the
> exact model is a one-line config change; use whatever is current/best-value.

---

## Documents in this repo

| Doc | What it covers |
|-----|----------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, serverless backend, AI adapter, data model, PF data schema |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased build plan (v0 → v1 → v1.5 → v2) with milestones |
| [docs/AI_FEEDBACK_DESIGN.md](docs/AI_FEEDBACK_DESIGN.md) | Feedback types, prompt strategy, tone system, cost/quality controls |
| [docs/CONTENT_AND_INTEGRITY_POLICY.md](docs/CONTENT_AND_INTEGRITY_POLICY.md) | Academic integrity, abuse prevention, rate limits, safety, privacy |

## Status

**Live:** https://ai-case-writer-tool.vercel.app

The editor is complete and in production — writing, formatting, word/speech-time
estimates, export (Markdown, plain text, printable speech view), and backup /
restore all work with no AI and no account.

The AI coach is built and deployed but **dormant until a provider key is set**.
To activate it, add `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` as environment
variables (Production scope) in the host dashboard and redeploy. `/api/health`
reports `aiConfigured: true` once they are live. Any OpenAI-compatible provider
works — DeepSeek, OpenRouter, Groq — by changing those three values only.

See [docs/ROADMAP.md](docs/ROADMAP.md) for what's next.
