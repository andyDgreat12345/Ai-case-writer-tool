// POST /api/rewrite
// Body: { text, tone, section?, resolution?, side? }
// Returns: { options: string[], budget }

import { complete, aiConfigured } from './_lib/ai.js'
import { allow, clientIp, perMinuteLimit, maxInputChars } from './_lib/ratelimit.js'
import { rewriteSystem, rewriteUser, isToneId } from './_lib/prompts.js'
import { parseLooseJson } from './_lib/json.js'
import { addsUnsupportedEvidence } from './_lib/guard.js'
import { clamp, overgrown, MAX_REWRITE_OPTIONS } from './_lib/bounds.js'
import { checkQuota, recordRequest, recordTokens, budgetFor } from './_lib/usage.js'

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

  const ip = clientIp(req)
  if (!allow(ip, perMinuteLimit())) {
    return res.status(429).json({ error: 'Slow down a moment and try again.' })
  }

  const quota = checkQuota(ip)
  if (!quota.allowed) {
    return res.status(429).json({ error: quota.reason, budget: budgetFor(ip) })
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

  recordRequest(ip)

  try {
    const { text: raw, tokens } = await complete({
      system: rewriteSystem(),
      user: rewriteUser({ text, tone, section, resolution, side }),
      json: true,
      temperature: 0.7,
      maxTokens: 700,
    })
    recordTokens(ip, tokens)

    let parsed: any
    try {
      parsed = parseLooseJson(raw)
    } catch {
      return res.status(502).json({ error: 'The coach returned an unreadable response. Try again.' })
    }

    const candidates = Array.isArray(parsed?.options)
      ? parsed.options
          .filter((o: any) => typeof o === 'string' && o.trim())
          .map((o: string) => clamp(o))
          .slice(0, MAX_REWRITE_OPTIONS)
      : []

    // A rewrite may polish wording, never add evidence the debater didn't
    // write, and never balloon into writing the case for them.
    const options = candidates.filter(
      (o: string) => !addsUnsupportedEvidence(text, o) && !overgrown(text, o),
    )

    if (options.length === 0) {
      return res.status(502).json({
        error: candidates.length
          ? 'The coach kept adding sources or going beyond your passage, so nothing was returned. Try a shorter passage without unsourced statistics.'
          : 'No rewrite came back. Try again.',
        budget: budgetFor(ip),
      })
    }

    return res.status(200).json({ options, budget: budgetFor(ip) })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    const code = msg.startsWith('AI_PROVIDER_4') ? 502 : 503
    return res.status(code).json({ error: 'The coach is unavailable right now. Your work is saved.' })
  }
}
