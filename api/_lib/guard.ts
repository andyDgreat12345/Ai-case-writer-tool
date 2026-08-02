// Last line of defence for the integrity policy's most important rule:
// the coach must never hand a debater a source, statistic, or quotation it
// invented. Prompt instructions alone are not enough — when asked to improve
// a span containing an unsourced claim, models will helpfully manufacture a
// plausible citation. This strips any such text before it reaches the user.

// "40 percent" and "40%" are the same figure. Without this, a rewrite that
// legitimately reuses the debater's own number gets blocked as fabricated.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/percentage points?/g, '%')
    .replace(/percent/g, '%')
    .replace(/\s+/g, ' ')
    .replace(/\s+%/g, '%')
}

const YEAR = /\b(19|20)\d{2}\b/g
const ATTRIBUTION = /according to/gi
const MONEY = /\$\s?\d[\d,.]*/g
const PERCENT = /\b\d+(\.\d+)?\s?(%|percent|percentage points?)/gi
const SOURCE_NOUNS =
  /\b(university|institute|institution|center|centre|bureau|agency|association|foundation|journal|commission)\b/gi
const EVIDENCE_NOUNS = /\b(study|studies|report|survey|poll|research|paper|analysis)\b/gi

// Rewrites are proposed replacement prose the debater may speak verbatim, so
// every evidence signal counts.
const REWRITE_PATTERNS = [YEAR, ATTRIBUTION, MONEY, PERCENT, SOURCE_NOUNS, EVIDENCE_NOUNS]

// Suggestions are advice, and advice legitimately says "find a study" or
// "cite a university source". Only fabricated-citation shapes matter here —
// a concrete year, an attribution, a figure.
const SUGGESTION_PATTERNS = [YEAR, ATTRIBUTION, MONEY, PERCENT]

function introducesAny(source: string, generated: string, patterns: RegExp[]): boolean {
  const haystack = normalize(source)
  const text = normalize(generated)
  for (const pattern of patterns) {
    const found = text.match(pattern)
    if (!found) continue
    for (const token of found) {
      if (!haystack.includes(token)) return true
    }
  }
  return false
}

// True when generated prose introduces evidence absent from the debater's text.
export function addsUnsupportedEvidence(source: string, generated: string): boolean {
  return introducesAny(source, generated, REWRITE_PATTERNS)
}

// True when advice text embeds a concrete, invented citation or figure.
export function addsFabricatedCitation(source: string, generated: string): boolean {
  return introducesAny(source, generated, SUGGESTION_PATTERNS)
}
