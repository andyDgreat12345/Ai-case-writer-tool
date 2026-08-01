// Model-agnostic AI adapter. Talks to any OpenAI-compatible Chat Completions
// API (DeepSeek by default). Switching provider/model = env vars only.
// Uses fetch so there are zero extra dependencies.

export interface CompleteOptions {
  system: string
  user: string
  json?: boolean
  maxTokens?: number
  temperature?: number
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY)
}

interface Attempt {
  ok: boolean
  status?: number
  text?: string
  detail?: string
}

async function callProvider(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Attempt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!resp.ok) {
      return { ok: false, status: resp.status, detail: (await resp.text()).slice(0, 400) }
    }
    const data: any = await resp.json()
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) return { ok: false, detail: 'AI_EMPTY_RESPONSE' }
    return { ok: true, text }
  } finally {
    clearTimeout(timer)
  }
}

// True when the provider rejected the request specifically because it does not
// support JSON mode — worth retrying as a plain completion.
function isJsonModeRejection(a: Attempt): boolean {
  if (a.status !== 400 && a.status !== 404 && a.status !== 422) return false
  const d = (a.detail ?? '').toLowerCase()
  return d.includes('response_format') || d.includes('json_object') || d.includes('json mode')
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')
  const model = process.env.AI_MODEL ?? 'deepseek-chat'
  if (!apiKey) throw new Error('AI_NOT_CONFIGURED')

  const base: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 900,
    temperature: opts.temperature ?? 0.4,
  }

  const withJson = opts.json
    ? { ...base, response_format: { type: 'json_object' } }
    : base

  let last: Attempt | undefined

  // Up to two attempts for transient failures.
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Attempt
    try {
      res = await callProvider(baseUrl, apiKey, withJson)
    } catch (err: any) {
      last = { ok: false, detail: String(err?.message ?? err) }
      continue
    }

    if (res.ok) return res.text!

    // Provider doesn't support JSON mode — drop it and ask plainly. The
    // response is parsed leniently downstream, so this still works.
    if (opts.json && isJsonModeRejection(res)) {
      const plain = await callProvider(baseUrl, apiKey, base)
      if (plain.ok) return plain.text!
      last = plain
      break
    }

    last = res
    const transient = res.status === 429 || (res.status ?? 0) >= 500
    if (!transient) break
  }

  throw new Error(
    last?.status ? `AI_PROVIDER_${last.status}: ${last.detail ?? ''}` : (last?.detail ?? 'AI_UNKNOWN_ERROR'),
  )
}
