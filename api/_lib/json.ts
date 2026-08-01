// Models sometimes wrap JSON in prose or a ```json fence even when asked not
// to. Recover the object rather than failing the user's request.

export function parseLooseJson(raw: string): any {
  const text = raw.trim()

  try {
    return JSON.parse(text)
  } catch {
    // fall through
  }

  // Strip a fenced code block, if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      // fall through
    }
  }

  // Last resort: the outermost {...} span.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      // fall through
    }
  }

  throw new Error('AI_UNPARSEABLE_JSON')
}
