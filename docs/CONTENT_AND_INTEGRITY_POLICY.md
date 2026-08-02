# Content, integrity & regulation policy

This is the "how we regulate the site" plan. A public tool that helps students
write competitive material, backed by a paid AI, needs guardrails for
**academic integrity**, **abuse/cost**, **safety**, and **privacy**. These are
product requirements, not afterthoughts.

## 1. Academic & competitive integrity

CaseForge is positioned as a **coach**, like Grammarly or a writing center — it
improves the student's own work; it does not do the work for them.

**Rules the product enforces**
- **No full-case generation.** There is no "write my case from the topic" button.
  The AI only acts on text the user has already written, section by section.
- **No fabricated evidence.** The model is instructed never to invent sources,
  statistics, or quotes. Argument feedback flags *"this needs a citation"* — it
  never manufactures one. This is the single most important rule (fabricated
  evidence in a real round is a serious offense).

  **Prompt instructions alone proved insufficient.** In live testing, asked to
  improve a span containing an unsourced statistic, the model returned a rewrite
  reading *"According to a 2020 study by the Stanford Institute for Economic
  Policy Research…"* — a complete fabrication a debater could have read aloud in
  a round. The rewrite field is the loophole: told to improve a weak claim, a
  model will helpfully invent the evidence that would make it strong.

  So this rule is now enforced **server-side as well as in the prompt**
  (`api/_lib/guard.ts`). Generated rewrites are scanned for evidence-like tokens
  — years, "according to", study/institution nouns, percentages, dollar figures —
  and if one appears that is **not present in the debater's own text**, the
  rewrite is discarded before it reaches the browser. `/api/rewrite` filters its
  options the same way. Tokens the debater already wrote pass through, so
  legitimate polishing is unaffected.

  The **advice field is filtered too**, at a deliberately narrower threshold.
  The same test run showed the model embedding a fabricated citation inside its
  `suggestion` as a worked example — *"e.g. 'According to a 2023 study by the
  Congressional Budget Office…'"* — which a debater could copy just as easily.
  Advice legitimately says "find a study" or "cite a university source", so
  suggestions are screened only for concrete **fabricated-citation shapes**
  (a year, an attribution, a money or percentage figure) and replaced with a
  safe instruction when one appears. Figures are compared after normalisation,
  so "40 percent" and "40%" count as the same number and reusing the debater's
  own statistic is never mistaken for inventing one.
- **Human-in-the-loop.** Every AI suggestion is accept/dismiss. Nothing is
  auto-inserted.
- **Own-voice preservation.** Rewrites refine the debater's wording; they don't
  substitute a generic AI argument.

**What we tell users (transparency)**
- A short, visible statement: *"CaseForge gives feedback on work you write. Check
  your league/tournament rules on AI assistance — some restrict it. You are
  responsible for verifying every source you cite."*
- Link this from the editor footer and an About page.

## 2. Abuse & cost protection

The AI costs money per call and the site is public.

- **Per-IP rate limits** (start conservative, tune with data):
  - Feedback/rewrite: ~10 / minute, ~100 / day per IP.
- **Input caps:** reject any section over `MAX_INPUT_CHARS` before it hits the
  model.
- **Output caps:** `maxTokens` per task.
- **Spend alerts** on the provider account + a monthly hard budget; if exceeded,
  AI endpoints return a graceful "coach paused for the day" while the editor
  keeps working.
- **Prompt-injection hygiene:** user text is passed as clearly delimited content,
  the system prompt asserts its instructions take precedence, and output is
  schema-validated. Tone is a fixed enum, not free text, to shrink the injection
  surface.

## 3. Content safety

- **Scope limiter:** the system prompt keeps the model on debate-writing help.
  Off-topic requests get a polite "I'm a debate-writing coach" redirect.
- **Harmful content:** rely on the provider's built-in safety plus a short
  refusal instruction for requests to produce harassing, hateful, or dangerous
  content. Debate topics can be sensitive (war, policy, ethics) — the coach
  engages with them academically and neutrally, without endorsing harm.
- **Minors:** debate skews to high-schoolers. Keep it COPPA-friendly by
  collecting **no personal data** in v1 (see below) and keeping content
  educational.

## 4. Privacy & data handling

- **v1 is login-free.** Cases are stored **in the user's browser** only. The
  server sees a section's text transiently to generate feedback and does not
  store it.
- **No accounts, no tracking, no analytics that identify users** in v1. If
  lightweight, privacy-respecting usage counts are added, they must be aggregate
  and anonymous.
- **Third-party disclosure:** the About/Privacy note states that text sent for
  feedback is processed by the AI provider, and links to that provider's policy.
  Users should not paste anything they consider confidential.
- **If accounts are added later (Phase 2):** that triggers a real privacy policy,
  secure auth, encryption at rest, a delete-my-data path, and (given likely
  minors) parental-consent consideration. Do not ship accounts without it.

## 5. Licensing & attribution

- Evidence the user pastes is theirs; CaseForge stores/exports it as-is and does
  **not** redistribute a shared card database (avoids copyright/licensing and
  moderation burden).
- Pick an open-source license for the code (MIT is a fine default) and a clear
  Terms of Use / disclaimer for the hosted site.

## 6. Operational guardrails

- Secrets only in host env vars; never committed. `.env.example` carries names,
  not values.
- Dependency and secret scanning in CI.
- A visible "report a problem" contact.

## 7. Summary — the regulation checklist before going public with AI on

- [ ] Rate limits + input/output caps live and tested.
- [ ] Provider spend alert + monthly budget set.
- [ ] "No fabricated evidence" + "no full-case generation" enforced in prompts
      and UI.
- [ ] Integrity/transparency notice visible in the app.
- [ ] Privacy note: local-only storage, provider disclosure, no confidential
      pasting.
- [ ] Prompt-injection hygiene (delimited input, fixed-enum tone, schema-checked
      output).
- [ ] License + Terms/disclaimer published.
