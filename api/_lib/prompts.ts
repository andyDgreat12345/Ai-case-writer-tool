// Prompt construction + the fixed tone system. Tones are a closed set (never
// free text) to keep output predictable and shrink the prompt-injection surface.

export const TONES = {
  analytical: 'measured, logical, precise; leans on evidence and clear links',
  persuasive: 'warm, vivid, rhetorical; emphasizes framing and impact',
  assertive: 'punchy, confident, direct; short sentences, strong verbs',
  formal: 'polished, restrained, traditional; appropriate for lay/formal judges',
} as const

export type ToneId = keyof typeof TONES

export function isToneId(x: unknown): x is ToneId {
  return typeof x === 'string' && x in TONES
}

const CORE_RULES = `You are an expert Public Forum (PF) debate coach helping a student improve a case they wrote.
Non-negotiable rules:
- NEVER invent statistics, sources, studies, or quotations. If a claim needs evidence, say so; do not fabricate a citation.
- This applies with full force to any text you rewrite. A rewrite must NEVER introduce an author, institution, publication, date, percentage, or dollar figure that is not already present in the student's own text. Rewriting an unsourced claim into a sourced-sounding one is the worst thing you can do here: the student may read it aloud in a real round and be caught fabricating evidence.
- If a passage cannot be improved without adding evidence the student has not provided, omit the "rewrite" field entirely and explain in "suggestion" what kind of source they need to find themselves.
- Improve the student's OWN words and argument. Do not replace their substance with a generic case.
- Be specific and actionable. Point to the exact phrase and say how to fix it.
- Stay strictly on debate-case-writing help. If asked for anything else, decline briefly and return an empty result.
- Stay inside the passage you were given. Comment only on that text — do not write new contentions, invent additional arguments, or continue the case beyond it.
- Be brief. One sentence per field. Never exceed 400 characters in any field. A rewrite must stay close to the length of the passage it replaces.`

function contextBlock(o: {
  resolution?: string
  side?: string
  section?: string
  tone?: ToneId
}): string {
  const lines: string[] = []
  if (o.resolution) lines.push(`Resolution: ${o.resolution}`)
  if (o.side) lines.push(`Side: ${o.side}`)
  if (o.section) lines.push(`This text is a: ${o.section}`)
  if (o.tone) lines.push(`Desired tone: ${o.tone} (${TONES[o.tone]})`)
  return lines.join('\n')
}

// ----- Feedback (writing or argument) -----

export type FeedbackKind = 'wording' | 'argument'

export function feedbackSystem(kind: FeedbackKind): string {
  const focus =
    kind === 'wording'
      ? `Focus ONLY on writing quality: clarity, grammar, flow, filler, and word choice. Do not re-argue the point.`
      : `Focus ONLY on argument quality for PF: is the warrant's reasoning sound, is the link chain complete, does the impact weigh, and where is evidence missing or thin? Flag gaps; do not invent evidence.`
  return `${CORE_RULES}\n\n${focus}\n\nRespond ONLY with JSON matching this exact shape:
{
  "summary": "one short sentence overall read",
  "suggestions": [
    {
      "type": "${kind}",
      "severity": "low" | "medium" | "high",
      "span": "the exact phrase from the text this refers to",
      "issue": "what is weak, in one sentence",
      "suggestion": "how to fix it, in one sentence",
      "rewrite": "an improved version of the span (omit if not applicable)"
    }
  ]
}
Return at most 4 suggestions, highest severity first. If the text is already strong, return an empty suggestions array. Keep every field to one short sentence.`
}

export function feedbackUser(o: {
  text: string
  resolution?: string
  side?: string
  section?: string
}): string {
  const ctx = contextBlock(o)
  return `${ctx ? ctx + '\n\n' : ''}Text to review (delimited):\n"""\n${o.text}\n"""`
}

// ----- Rewrite (persuasion / tone) -----

export function rewriteSystem(): string {
  return `${CORE_RULES}\n\nRewrite the passage to be more persuasive and authentic while preserving the student's argument, meaning, and any cited evidence. Match the desired tone. Do NOT add new facts or sources.\n\nRespond ONLY with JSON of this shape:
{ "options": ["rewrite option 1", "rewrite option 2"] }
Provide exactly 2 distinct options. Each must stay close to the original length — polish the passage, do not expand it into new argument.`
}

export function rewriteUser(o: {
  text: string
  resolution?: string
  side?: string
  section?: string
  tone: ToneId
}): string {
  const ctx = contextBlock(o)
  return `${ctx ? ctx + '\n\n' : ''}Passage to rewrite (delimited):\n"""\n${o.text}\n"""`
}
