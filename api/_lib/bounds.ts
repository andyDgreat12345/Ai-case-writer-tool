// Keeps the coach inside its lane.
//
// Two separate concerns:
//  - Cost: an unbounded response is an unbounded bill.
//  - Scope: a "rewrite" that balloons past the passage it was given has stopped
//    editing the debater's words and started writing the case for them, which
//    the integrity policy forbids just as firmly as fabricating a source.

export const MAX_SUGGESTIONS = 4
export const MAX_FIELD_CHARS = 400
export const MAX_REWRITE_OPTIONS = 2

// A rewrite may tighten or slightly expand a passage, not replace it with an
// essay. Generous enough that legitimate polishing always passes.
const REWRITE_GROWTH_FACTOR = 2.2
const REWRITE_GROWTH_ALLOWANCE = 120

export function clamp(text: string, max = MAX_FIELD_CHARS): string {
  const t = String(text ?? '').trim()
  if (t.length <= max) return t
  // Cut at a sentence or word boundary so the result still reads cleanly.
  const cut = t.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (stop > max * 0.6) return cut.slice(0, stop + 1)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}

// True when generated prose has outgrown the passage it was meant to improve.
export function overgrown(source: string, generated: string): boolean {
  const src = String(source ?? '').trim().length
  const gen = String(generated ?? '').trim().length
  if (src === 0) return gen > REWRITE_GROWTH_ALLOWANCE
  return gen > src * REWRITE_GROWTH_FACTOR + REWRITE_GROWTH_ALLOWANCE
}
