# Architecture

This describes how CaseForge is built and why. Decisions are optimized for a
**public, low-budget, safe-to-launch** tool that a single developer can ship and
maintain.

## 1. Guiding constraints

- **Cheap at rest.** Should cost ~$0 when nobody is using it.
- **API keys never in the browser.** Any secret (DeepSeek/other) lives only in
  the backend. This forces a small server layer even for a "static" site.
- **Model-agnostic.** "DeepSeek V4" may or may not exist; providers and prices
  change. Swapping models must be a config change, not a rewrite.
- **Login-free v1.** No accounts, no database, no personal data to protect yet.

## 2. High-level shape

```
┌─────────────────────────────┐        ┌────────────────────────────┐
│         Browser (SPA)       │        │   Serverless functions      │
│                             │        │   (/api/*)                  │
│  Structured case editor     │  HTTPS │                            │
│  - sections & fields        │ ─────► │  /api/feedback              │
│  - localStorage autosave    │        │  /api/rewrite               │
│  - export (md / txt / doc)  │ ◄───── │  /api/health                │
│  - calls /api/* for AI      │  JSON  │      │                      │
└─────────────────────────────┘        │      ▼                      │
                                        │  AI adapter (provider-      │
                                        │  agnostic) ── DeepSeek etc. │
                                        │  + rate limiting            │
                                        │  + input/output guards      │
                                        └────────────────────────────┘
```

The frontend is a static bundle. The only server-side code is a handful of
serverless functions. There is **no database in v1**.

## 3. Frontend

**Recommended stack:** a small SPA with a component framework and a rich-ish
text area per field. Two reasonable choices:

- **Astro + a few React/Svelte islands** — matches the existing
  `andydgreat12345.github.io` site, static-first, easy to embed/link.
- **Vite + React** — simplest if the app grows into a full editor.

Recommendation: **Vite + React** for the app itself (the editor is genuinely
interactive), and link to it from the Astro portfolio. Keep it a separate
deploy so the portfolio stays a clean static site.

**Editor model.** The case is a typed document (see §6). Each field is a
controlled input. Autosave to `localStorage` on a debounce. A "documents" list
lets a user keep several cases locally.

**Why not a single free-text box?** The structure *is* the product — it teaches
PF form and gives the AI clean, labeled context ("this is a warrant") which
produces far better feedback than an unlabeled blob.

## 4. Backend (serverless functions)

Hosted on **Vercel or Netlify** (both have a free tier that covers early
traffic). Each endpoint is a stateless function.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Liveness + which model is configured (no secrets). |
| `/api/feedback` | POST | Return structured feedback for a section/selection. |
| `/api/rewrite` | POST | Return a rewritten passage for a chosen tone/goal. |

Responsibilities of every AI endpoint:
1. **Validate input** — length caps, required fields, reject empty/garbage.
2. **Rate limit** — per-IP token bucket (see §7). Protects the API budget.
3. **Build the prompt** — inject topic, section type, tone, and task template.
4. **Call the AI adapter** — with timeout + one retry on transient errors.
5. **Guard the output** — shape-check JSON, strip anything unexpected.
6. **Return** a small, typed JSON payload the frontend can render.

Secrets (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`) come from environment
variables in the host's dashboard — never committed.

## 5. The AI adapter (model-agnostic)

A single module behind an interface so the rest of the app never names a
provider:

```ts
interface AIProvider {
  complete(input: {
    system: string;
    user: string;
    json?: boolean;          // ask for JSON-mode when supported
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string; usage?: TokenUsage }>;
}
```

- **DeepSeek** is reached through its OpenAI-compatible Chat Completions API, so
  the adapter is essentially the OpenAI SDK pointed at DeepSeek's `base_url`
  with `model` = the current DeepSeek chat/reasoner model.
- Switching to another provider = new adapter file + change 3 env vars.
- `AI_MODEL` is configuration, so "use whatever DeepSeek is current" is literally
  a dashboard edit — no code deploy.

Keep prompt templates in `/prompts` as versioned files (see AI_FEEDBACK_DESIGN).

## 6. Case data model

The document the editor edits and export/AI consume. Stored as JSON in
`localStorage`; each doc has a stable `id`.

```ts
type Side = "PRO" | "CON";

interface CaseDoc {
  id: string;
  title: string;
  resolution: string;        // the topic/resolution text
  side: Side;
  createdAt: string;
  updatedAt: string;

  framework: {
    text: string;            // weighing mechanism / standard
  };
  definitions: Array<{
    term: string;
    definition: string;
    source?: string;
  }>;
  contentions: Array<{
    id: string;
    title: string;
    claim: string;
    warrant: string;         // the reasoning
    evidence: Array<{
      text: string;          // the card / stat / quote
      citation: string;      // author, date, outlet
      url?: string;
    }>;
    impact: string;          // why it matters + weighing
  }>;

  settings: {
    tone?: ToneId;           // see AI_FEEDBACK_DESIGN
    targetWordCount?: number;
  };
}
```

**Word/time estimate.** Derived client-side from concatenated speakable fields
(claim + warrant + evidence + impact + framework), at ~150 wpm.

**Export.** Pure client-side transforms of `CaseDoc`:
- Markdown (portable), plain text, and a formatted "speech doc" HTML view for
  printing / reading aloud. `.docx` export can reuse the repo's docx tooling
  later.

## 7. Rate limiting, cost, and abuse control

Because the AI costs money per call and the tool is public:
- **Per-IP token bucket** in each function (e.g. N feedback calls / minute, M /
  day). For serverless, use the host's KV/Edge store or a lightweight
  in-memory+header approach; upgrade to a shared store (Upstash Redis free tier)
  if abuse appears.
- **Hard input caps** — reject sections over a max character length before they
  reach the model.
- **Max output tokens** per task so a single call can't run away.
- **A monthly spend alert** on the AI provider account.

Details and thresholds live in
[CONTENT_AND_INTEGRITY_POLICY.md](CONTENT_AND_INTEGRITY_POLICY.md).

## 8. Configuration & secrets

| Env var | Where | Example |
|---------|-------|---------|
| `AI_API_KEY` | host dashboard | `sk-...` |
| `AI_BASE_URL` | host dashboard | `https://api.deepseek.com` |
| `AI_MODEL` | host dashboard | current DeepSeek chat/reasoner model |
| `RATE_LIMIT_PER_MIN` | host dashboard | `10` |
| `MAX_INPUT_CHARS` | host dashboard | `6000` |

A committed `.env.example` documents these with **no real values**.

## 9. Repository layout (target)

```
/                      README + config
/docs                  these planning docs
/web                   frontend SPA (Vite + React)
  /src/components       editor sections, feedback panel
  /src/lib             CaseDoc model, storage, export, api client
/api                   serverless functions (feedback, rewrite, health)
/prompts               versioned prompt templates
.env.example
```

## 10. Deployment

- **Frontend + `/api`** deploy together on Vercel/Netlify from `main`.
- Preview deploys on PRs.
- The portfolio site links to the deployed app URL.
- CI: typecheck + lint + a smoke test that `/api/health` returns the configured
  model name.
