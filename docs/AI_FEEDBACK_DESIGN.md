# AI feedback design

How the DeepSeek (or any) model is used to give useful, safe, affordable
feedback. The goal is **coaching**, not ghost-writing.

## 1. Feedback types

Each maps to a task template and a distinct button in the UI.

| Type | Question it answers | Scope |
|------|--------------------|-------|
| **Wording** | Is this clear and well-written? | Grammar, clarity, flow, filler, word choice. |
| **Persuasion / authenticity** | Does this land and sound real? | Rhetorical force, concreteness, natural voice. |
| **Argument / logic** | Does this argument hold up? | Warrant strength, link chain, impact logic, evidence gaps. |
| **Tone match** | Does this fit the chosen style? | Rewrites/tunes to a selected debate tone. |

Feedback is requested **per section or per selection**, never "grade my whole
case." Small scope → cheaper calls, sharper suggestions, easier to act on.

## 2. Structured output

The model is asked to return **JSON**, not prose, so the UI can render
accept/dismiss suggestions:

```json
{
  "summary": "One-sentence read on this passage.",
  "suggestions": [
    {
      "type": "wording",
      "severity": "low|medium|high",
      "span": "the exact text this refers to",
      "issue": "what's weak",
      "suggestion": "how to fix it",
      "rewrite": "optional improved version of the span"
    }
  ]
}
```

`rewrite` endpoints return `{ "options": ["...", "..."] }` — 2–3 variants the
user chooses from, so the AI proposes and the human decides.

## 3. Prompt strategy

Prompts are versioned files in `/prompts`, composed at request time from:

1. **System role** — "You are a Public Forum debate coach. You give targeted,
   actionable feedback. You never invent statistics, sources, or quotes. You
   improve the debater's own words rather than replacing their argument."
2. **Context block** — resolution, side (PRO/CON), section type (e.g. "this is a
   *warrant*"), and the chosen tone.
3. **Task template** — the specific ask (wording vs. logic vs. rewrite) and the
   required JSON schema.
4. **User content** — the section/selection text (length-capped).

Labeling the section type is what makes feedback *debate-aware* rather than
generic essay feedback — the model knows a warrant should explain *why* a claim
is true, an impact should *weigh*, etc.

### Topic-specific tuning
The **resolution** is always in context, so feedback is naturally topic-aware
("your warrant assumes X about this specific policy…"). For argument feedback we
also instruct the model to flag **where a claim needs evidence** — but it must
say "this needs a source" rather than fabricating one (see integrity policy).

## 4. Tone system

A small, fixed set of named tones (avoids a free-text tone injection surface and
keeps output predictable):

| Tone id | Feel | Use |
|---------|------|-----|
| `analytical` | Measured, logical, precise | Judges who flow closely; evidence-heavy rounds. |
| `persuasive` | Warm, vivid, rhetorical | Lay judges; framing/impact emphasis. |
| `assertive` | Punchy, confident, direct | Fast, clash-heavy rounds. |
| `formal` | Polished, restrained | Traditional/lay-formal circuits. |

The selected tone is passed into feedback and rewrite prompts. Tone changes
*style*, never the argument's substance or the evidence.

## 5. Quality guardrails

- **No fabrication.** The system prompt forbids inventing sources, stats, or
  quotes. Argument feedback flags evidence gaps; it does not fill them.
- **Human-in-the-loop.** AI proposes; every suggestion is accept/dismiss. Nothing
  auto-applies.
- **Own-voice preservation.** Rewrites improve the debater's wording; they don't
  swap in a generic AI case.
- **Bounded output.** `maxTokens` per task; JSON shape validated server-side.

## 6. Cost & performance controls

- Per-section calls keep tokens small and predictable.
- **Rate limit** per IP (config in ARCHITECTURE §7).
- Optional **debounce/caching**: identical text + task returns the last result
  (hash the input) to avoid paying twice.
- Prefer a cheaper chat model for wording; reserve a reasoning model (e.g.
  DeepSeek-R1-class) for argument/logic feedback where it's worth it. Which model
  handles which task is config-driven.

## 7. Failure behavior

- On timeout / provider error: one retry, then a friendly "coach is unavailable,
  your writing is saved" message. The editor **never blocks on the AI** — the
  Phase 1 editor works fully offline.
- On malformed model output: server discards it and returns a generic error
  rather than passing junk to the UI.
