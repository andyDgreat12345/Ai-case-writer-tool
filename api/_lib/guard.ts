// Last line of defence for the integrity policy's most important rule:
// the coach must never hand a debater a source, statistic, or quotation it
// invented. Prompt instructions alone are not enough — when asked to improve
// a span containing an unsourced claim, models will helpfully manufacture a
// plausible citation. This strips any such text before it reaches the user.

// Tokens that signal evidence. If one appears in generated text but not in
// what the debater wrote, the model introduced it.
const EVIDENCE_PATTERNS: RegExp[] = [
  /\b(19|20)\d{2}\b/g, // a year
  /according to/gi,
  /\b(study|studies|report|survey|poll|research|paper|analysis|data)\b/gi,
  /\b(university|institute|institution|center|centre|bureau|department|agency|association|foundation|journal|review|commission)\b/gi,
  /\b\d+(\.\d+)?\s?(%|percent|percentage points?)\b/gi,
  /\$\s?\d[\d,.]*/g,
]

// True when `generated` introduces evidence-like tokens absent from `source`.
export function addsUnsupportedEvidence(source: string, generated: string): boolean {
  const haystack = source.toLowerCase()
  for (const pattern of EVIDENCE_PATTERNS) {
    const found = generated.match(pattern)
    if (!found) continue
    for (const token of found) {
      if (!haystack.includes(token.toLowerCase())) return true
    }
  }
  return false
}
