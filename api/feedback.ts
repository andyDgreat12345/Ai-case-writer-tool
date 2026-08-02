// POST /api/feedback
// Body: { text, kind: 'wording'|'argument', section?, resolution?, side? }
// Returns: { summary, suggestions: [...], budget }

import { complete, aiConfigured } from './_lib/ai.js'
import { allow, clientIp, perMinuteLimit, maxInputChars } from './_lib/ratelimit.js'
import { feedbackSystem, feedbackUser, type FeedbackKind } from './_lib/prompts.js'
import { parseLooseJson } from './_lib/json.js'
import { addsUnsupportedEvidence, addsFabricatedCitation } from './_lib/guard.js'
import { clamp, overgrown, MAX_SUGGESTIONS } from './_lib/bounds.js'
import { checkQuota, recordRequest, recordTokens, budgetFrom } from './_lib/usage.js'
import { originAllowed } from './_lib/origin.js'

const WITHHELD =
  'A suggested rewrite was withheld because it invented a source or figure you did not write. Find and verify that evidence yourself.'
const SAFE_SUGGESTION =
  'This claim needs a real citation. Find a credible source and cite it yourself — an example was withheld because it invented one.'

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

  if (!originAllowed(req)) {
    return res.status(403).json({ error: 'This coach only serves its own site.' })
  }

  const ip = clientIp(req)
  if (!allow(ip, perMinuteLimit())) {
    return res.status(429).json({ error: 'Slow down a moment and try again.' })
  }

  const quota = await checkQuota(ip)
  if (!quota.allowed) {
    return res.status(429).json({ error: quota.reason, budget: budgetFrom(quota.usage) })
  }

  const { text, kind, section, resolution, side } = body(req)
  const k: FeedbackKind = kind === 'argument' ? 'argument' : 'wording'

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Nothing to review yet — write some text first.' })
  }
  if (text.length > maxInputChars()) {
    return res.status(400).json({ error: 'That section is too long to review at once.' })
  }

  await recordRequest(ip)

  try {
    const { text: raw, tokens } = await complete({
      system: feedbackSystem(k),
      user: feedbackUser({ text, section, resolution, side }),
      json: true,
      temperature: 0.3,
      maxTokens: 700,
    })
    await recordTokens(ip, tokens)

    let parsed: any
    try {
      parsed = parseLooseJson(raw)
    } catch {
      return res.status(502).json({ error: 'The coach returned an unreadable response. Try again.' })
    }

    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
          .filter((s: any) => s && typeof s === 'object')
          .slice(0, MAX_SUGGESTIONS)
          .map((s: any) => {
            // Drop any rewrite that smuggles in evidence the debater never
            // wrote, or that has outgrown the passage it was meant to improve.
            const rewrite = s.rewrite ? clamp(String(s.rewrite)) : undefined
            const rewriteBlocked =
              Boolean(rewrite) &&
              (addsUnsupportedEvidence(text, rewrite!) || overgrown(s.span ?? text, rewrite!))

            // Advice can leak a fabricated citation too, as a worked example.
            const rawSuggestion = clamp(String(s.suggestion ?? ''))
            const suggestionBlocked = addsFabricatedCitation(text, rawSuggestion)

            return {
              type: k,
              severity: ['low', 'medium', 'high'].includes(s.severity) ? s.severity : 'medium',
              span: clamp(String(s.span ?? '')),
              issue: clamp(String(s.issue ?? '')),
              suggestion: suggestionBlocked ? SAFE_SUGGESTION : rawSuggestion,
              rewrite: rewriteBlocked ? undefined : rewrite,
              ...(rewriteBlocked || suggestionBlocked ? { note: WITHHELD } : {}),
            }
          })
      : []

    return res.status(200).json({
      summary: clamp(String(parsed?.summary ?? ''), 200),
      suggestions,
      budget: budgetFrom({
        ...quota.usage,
        requests: quota.usage.requests + 1,
        tokens: quota.usage.tokens + tokens,
      }),
    })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    const code = msg.startsWith('AI_PROVIDER_4') ? 502 : 503
    return res.status(code).json({ error: 'The coach is unavailable right now. Your work is saved.' })
  }
}
