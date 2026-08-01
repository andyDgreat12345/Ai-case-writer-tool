# Roadmap

Phased so each stage is independently useful and shippable. Scope decisions:
**serverless backend**, **login-free v1**, **structured editor is the v1 core**;
AI coaching lands right after as v1.5.

---

## Phase 0 — Foundations (repo + skeleton) ✅

- [x] Scaffold the Vite + React app and `/api` (health function).
- [x] `CaseDoc` TypeScript model + `localStorage` load/save.
- [x] `.env.example`, typecheck, first deploy to Vercel.
- [x] `/api/health` returns configured model name (no secret).

**Live at:** https://ai-case-writer-tool.vercel.app

---

## Phase 1 — Structured case editor (v1 core) ✅

A debater can write, format, save, and export a full PF constructive with
**no AI at all**.

- [x] Resolution + side (PRO/CON) + title header.
- [x] Framework section.
- [x] Definitions (add/edit/remove term + definition + optional source).
- [x] Contentions with Claim → Warrant → Evidence[] → Impact.
- [x] Live word count + speech-time estimate against a target.
- [x] Autosave; multiple saved cases; duplicate/delete.
- [x] Export: Markdown, plain text, printable "speech doc" view.

---

## Phase 1.5 — AI coach (the DeepSeek layer) ✅ built

Targeted, topic-aware feedback per section. See
[AI_FEEDBACK_DESIGN.md](AI_FEEDBACK_DESIGN.md).

- [x] `/api/feedback` with the model-agnostic adapter + rate limiting.
- [x] **Writing & wording feedback** (clarity, grammar, flow, filler).
- [x] Feedback panel UI: per-section "Get feedback", suggestions, accept/dismiss.
- [x] `/api/rewrite` — **persuasion & authenticity** rewrite of a selection.
- [x] **Tone selector** applied to feedback + rewrite.
- [x] **Argument feedback** (warrant strength, links, impact logic, evidence gaps).
- [x] Input caps + output guards in code.
- [x] Provider hardening: JSON-mode fallback + lenient JSON parsing, so any
      OpenAI-compatible provider works even without strict JSON support.
- [ ] **Activation:** set `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` in the host
      dashboard (Production scope) and set a spend alert on the provider account.

---

## Phase 2 — Polish & retention

- [x] **Backup & restore** — export all cases to `.json` and merge-restore them.
      The safety net for a login-free tool whose data lives in `localStorage`.
- [x] **Guided starter template** — structural scaffolding that teaches PF form
      (prompts only, never pre-written arguments or evidence).
- [x] **About & integrity dialog** — the user-facing half of the content policy:
      what the coach won't do, league-rules warning, and the data notice.
- [ ] `.docx` export.
- [ ] Rebuttal / block scratchpad (prep beyond the constructive).
- [ ] Shareable read-only link (needs minimal backend storage).
- [ ] **Accounts + cloud sync** — only if users ask for it; triggers the
      privacy/data-handling work deferred from v1.

---

## Explicitly out of scope (for now)

- Full auto-generation of a case from a prompt (see integrity policy).
- Live in-round/tournament features.
- A shared evidence/card database (licensing + moderation burden).
