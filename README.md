# CaseForge — AI case-writing assistant for Public Forum debate

A structured editor for a **Public Forum constructive speech**, with an AI coach
that gives feedback on wording, persuasion, tone, and argument logic — the way
academic-writing sites give feedback on essays.

**Live:** https://ai-case-writer-tool.vercel.app

> A personal project, shared openly. It's built for my own debate prep and
> published in case it's useful to someone else. Not a product, not a service,
> and not actively supported — see [Scope](#scope) below.

---

## What it does

**The editor** — works fully offline, no account, no AI required
- Resolution, side (PRO/CON), framework, and definitions
- **Flexible contentions:** a contention is a sequence of blocks — *Warrant /
  Evidence / Impact / Analysis* — you add, reorder, retype, and repeat. One
  contention can carry several warrants, interleaved evidence, and more than one
  impact.
- Live word count and speech-time estimate against a target (~150 wpm)
- Autosave to the browser; multiple cases; backup and restore to `.json`
- Export to Markdown, plain text, and a printable **speech view**

**The AI coach** — optional, per section
- **Writing feedback:** clarity, grammar, flow, filler, word choice
- **Argument feedback:** warrant strength, link chains, impact weighing, and
  where evidence is missing
- **Rewrite:** more persuasive phrasing in one of four tones — analytical,
  persuasive, assertive, formal

## What it deliberately won't do

This is a **coaching** tool, not a case generator. These are enforced in code,
not just asked of the model — see
[docs/CONTENT_AND_INTEGRITY_POLICY.md](docs/CONTENT_AND_INTEGRITY_POLICY.md).

- **No full-case generation.** The AI only acts on text you have already written.
- **No fabricated evidence.** In testing the model invented a citation —
  *"According to a 2020 study by the Stanford Institute…"* — while rewriting an
  unsourced claim. Prompt rules alone did not stop it, so generated text is now
  **filtered server-side**: any source, year, institution, percentage, or dollar
  figure that isn't already in your own writing is stripped before it reaches
  you, and you're told why.
- **No rewriting evidence.** Evidence blocks have no coach buttons at all.
  Altering a quoted card is falsifying a source.
- **No writing past your passage.** A rewrite that balloons beyond the text it
  was given is discarded — at that point it's writing your case, not editing it.

**Check your league's rules on AI assistance before using this for real prep,
and verify every source you cite.** You are accountable for what you read aloud.

---

## Running your own copy

You need your own AI provider key — **mine is not in this repo and never was.**

```bash
git clone https://github.com/andyDgreat12345/Ai-case-writer-tool.git
cd Ai-case-writer-tool
npm install
npm run dev          # editor works immediately; coach needs a key
```

Deploy to Vercel (or any host with serverless functions), then set these
environment variables — see [.env.example](.env.example) for the full list:

| Variable | Purpose |
|---|---|
| `AI_API_KEY` | Your provider key. **Never commit this.** |
| `AI_BASE_URL` | e.g. `https://api.deepseek.com` |
| `AI_MODEL` | e.g. `deepseek-chat` |

The AI adapter is provider-agnostic — any OpenAI-compatible Chat Completions API
works (DeepSeek, OpenRouter, Groq, …) by changing those three values. Nothing
else in the code names a provider.

Without a key the editor still runs; the coach simply reports that it isn't
configured.

### Protecting your budget

The coach costs money per call (~700 tokens per request in practice). If you
deploy publicly, set these too:

- `ALLOWED_ORIGINS` — comma-separated origins allowed to call the API, so
  someone else's site can't spend your credit. Unset means no check.
- `RATE_LIMIT_PER_DAY`, `TOKEN_BUDGET_PER_DAY`, `SITE_TOKEN_BUDGET_PER_DAY`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — **required for the
  daily caps to actually bind.** Without a shared store, serverless instances
  each keep their own counter and the daily cap does not hold; the app detects
  this and hides the allowance badge rather than showing a figure that isn't
  real.

**Set a hard spend limit on your provider account regardless.** That is the only
ceiling that cannot be bypassed.

---

## Docs

| Doc | Covers |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, AI adapter, data model, deployment |
| [ROADMAP](docs/ROADMAP.md) | What's built and what isn't |
| [AI_FEEDBACK_DESIGN](docs/AI_FEEDBACK_DESIGN.md) | Prompt strategy, tone system, guardrails |
| [CONTENT_AND_INTEGRITY_POLICY](docs/CONTENT_AND_INTEGRITY_POLICY.md) | Integrity, abuse/cost control, safety, privacy |

## Privacy

No accounts and no database. Cases live in your browser's `localStorage` and
nowhere else. When you request feedback, that section's text is sent to the AI
provider to generate a response and is not stored by the site. Don't paste
anything confidential.

## Scope

A personal project. Bug reports and small fixes are welcome via issues, but I'm
not looking to grow this into a maintained product, and I may not respond
quickly. Fork it freely — that's what the licence is for.

## Licence

[MIT](LICENSE) © 2026 andyDgreat12345
