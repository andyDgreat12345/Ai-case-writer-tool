// POST /api/rewrite
// Body: { text, tone, section?, resolution?, side? }
// Returns: { options: string[] }

import { complete, aiConfigured } from './_lib/ai'
import { allow, clientIp, perMinuteLimit, maxInputChars } from './_lib/ratelimit'
import { rewriteSystem, rewriteUser, isToneId } from './_lib/prompts'
import { parseLooseJson } from './_lib/json'

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

  const { text, tone, section, resolution, side } = body(req)

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Nothing to rewrite yet — write some text first.' })
  }
  if (text.length > maxInputChars()) {
    return res.status(400).json({ error: 'That passage is too long to rewrite at once.' })
  }
  if (!isToneId(tone)) {
    return res.status(400).json({ error: 'Pick a valid tone.' })
  }

  try {
    const raw = await complete({
      system: rewriteSystem(),
      user: rewriteUser({ text, tone, section, resolution, side }),
      json: true,
      temperature: 0.7,
      maxTokens: 900,
    })

    let parsed: any
    try {
      parsed = parseLooseJson(raw)
    } catch {
      return res.status(502).json({ error: 'The coach returned an unreadable response. Try again.' })
    }

    const options = Array.isArray(parsed?.options)
      ? parsed.options.filter((o: any) => typeof o === 'string' && o.trim()).slice(0, 3)
      : []

    if (options.length === 0) {
      return res.status(502).json({ error: 'No rewrite came back. Try again.' })
    }

    return res.status(200).json({ options })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    const code = msg.startsWith('AI_PROVIDER_4') ? 502 : 503
    return res.status(code).json({ error: 'The coach is unavailable right now. Your work is saved.' })
  }
}
