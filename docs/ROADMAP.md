# Roadmap

Phased so each stage is independently useful and shippable. Scope decisions:
**serverless backend**, **login-free v1**, **structured editor is the v1 core**;
AI coaching lands right after as v1.5.

---

## Phase 0 — Foundations (repo + skeleton)

Goal: a running, empty-but-real app you can deploy.

- [ ] Scaffold `/web` (Vite + React) and `/api` (health function).
- [ ] `CaseDoc` TypeScript model + `localStorage` load/save.
- [ ] `.env.example`, lint/typecheck, CI, first deploy to Vercel/Netlify.
- [ ] `/api/health` returns configured model name (no secret).

**Done when:** the app deploys and `/api/health` is green.

---

## Phase 1 — Structured case editor (v1 core)

Goal: a debater can write, format, save, and export a full PF constructive with
**no AI at all**. This alone is a useful tool.

- [ ] Resolution + side (PRO/CON) + title header.
- [ ] Framework section.
- [ ] Definitions (add/edit/remove term + definition + optional source).
- [ ] Contentions with Claim → Warrant → Evidence[] → Impact.
- [ ] Live word count + speech-time estimate against a target.
- [ ] Autosave; multiple saved cases; duplicate/delete.
- [ ] Export: Markdown, plain text, printable "speech doc" view.

**Done when:** a real case can be written and exported end to end offline.

---

## Phase 1.5 — AI coach (the DeepSeek layer)

Goal: targeted, topic-aware feedback per section/selection. See
[AI_FEEDBACK_DESIGN.md](AI_FEEDBACK_DESIGN.md).

- [x] `/api/feedback` with the model-agnostic adapter + rate limiting.
- [x] **Writing & wording feedback** (clarity, grammar, flow, filler).
- [x] Feedback panel UI: per-section "Get feedback", inline suggestions,
      accept/dismiss.
- [x] `/api/rewrite` — **persuasion & authenticity** rewrite of a selection.
- [x] **Tone selector** (see tone system) applied to feedback + rewrite.
- [x] **Argument feedback** (warrant strength, links, impact logic, evidence
      gaps), topic-tuned.
- [x] Input caps + output guards in code. *(Spend alert is a dashboard step —
      set it on the AI provider account before turning the key on.)*

**Done when:** each section can be reviewed and improved with the AI, safely and
within a predictable budget.

---

## Phase 2 — Polish & retention (optional)

- [ ] Case templates / examples per common resolution type.
- [ ] `.docx` export.
- [ ] Rebuttal / block scratchpad (prep beyond the constructive).
- [ ] Shareable read-only link (needs minimal backend storage).
- [ ] **Accounts + cloud sync** (Supabase/Clerk) — only if users ask for it;
      triggers the privacy/data-handling work deferred from v1.

---

## Explicitly out of scope (for now)

- Full auto-generation of a case from a prompt (see integrity policy).
- Live in-round/tournament features.
- A shared evidence/card database (licensing + moderation burden).

## Sequencing note

Phases 0 → 1 have **no API cost and no user data**, so they can go fully public
with zero risk. Turn on Phase 1.5 (AI) only once rate limiting and the spend
alert are in place.
