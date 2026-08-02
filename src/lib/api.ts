import type { ToneId } from './tone'

export interface Suggestion {
  type: 'wording' | 'argument'
  severity: 'low' | 'medium' | 'high'
  span: string
  issue: string
  suggestion: string
  rewrite?: string
  // Set when the server withheld a rewrite that invented a source or figure.
  note?: string
}

export interface FeedbackResult {
  summary: string
  suggestions: Suggestion[]
}

interface Ctx {
  section?: string
  resolution?: string
  side?: string
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error || 'The coach is unavailable right now.')
  }
  return data as T
}

export function getFeedback(
  input: { text: string; kind: 'wording' | 'argument' } & Ctx,
): Promise<FeedbackResult> {
  return postJson<FeedbackResult>('/api/feedback', input)
}

export function getRewrite(
  input: { text: string; tone: ToneId } & Ctx,
): Promise<{ options: string[] }> {
  return postJson<{ options: string[] }>('/api/rewrite', input)
}
