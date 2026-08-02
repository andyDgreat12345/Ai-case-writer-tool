// POST /api/feedback
// Body: { text, kind: 'wording'|'argument', section?, resolution?, side? }
// Returns: { summary, suggestions: [...] }

import { complete, aiConfigured } from './_lib/ai.js'
import { allow, clientIp, perMinuteLimit, maxInputChars } from './_lib/ratelimit.js'
import { feedbackSystem, feedbackUser, type FeedbackKind } from './_lib/prompts.js'
import { parseLooseJson } from './_lib/json.js'

function body(req: any): any {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!aiConfigured()) {
    return res.status(503).json({ error: 'The AI coach is not configured yet.' })
  }
  if (!allow(clientIp(req), perMinuteLimit())) {
    return res.status(429).json({ error: 'Slow down a moment and try again.' })
  }

  const { text, kind, section, resolution, side } = body(req)
  const k: FeedbackKind = kind === 'argument' ? 'argument' : 'wording'

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Nothing to review yet — write some text first.' })
  }
  if (text.length > maxInputChars()) {
    return res.status(400).json({ error: 'That section is too long to review at once.' })
  }

  try {
    const raw = await complete({
      system: feedbackSystem(k),
      user: feedbackUser({ text, section, resolution, side }),
      json: true,
      temperature: 0.3,
      maxTokens: 900,
    })

    let parsed: any
    try {
      parsed = parseLooseJson(raw)
    } catch {
      return res.status(502).json({ error: 'The coach returned an unreadable response. Try again.' })
    }

    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
          .filter((s: any) => s && typeof s === 'object')
          .slice(0, 5)
          .map((s: any) => ({
            type: k,
            severity: ['low', 'medium', 'high'].includes(s.severity) ? s.severity : 'medium',
            span: String(s.span ?? ''),
            issue: String(s.issue ?? ''),
            suggestion: String(s.suggestion ?? ''),
            rewrite: s.rewrite ? String(s.rewrite) : undefined,
          }))
      : []

    return res.status(200).json({
      summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
      suggestions,
    })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    const code = msg.startsWith('AI_PROVIDER_4') ? 502 : 503
    return res.status(code).json({ error: 'The coach is unavailable right now. Your work is saved.' })
  }
}
