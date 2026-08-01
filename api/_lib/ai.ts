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

export async function complete(opts: CompleteOptions): Promise<string> {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')
  const model = process.env.AI_MODEL ?? 'deepseek-chat'
  if (!apiKey) throw new Error('AI_NOT_CONFIGURED')

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 900,
    temperature: opts.temperature ?? 0.4,
  }
  if (opts.json) body.response_format = { type: 'json_object' }

  // One transient-error retry.
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
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
        const detail = (await resp.text()).slice(0, 300)
        // 429 / 5xx are worth a retry; others are not.
        if (resp.status === 429 || resp.status >= 500) {
          lastErr = new Error(`AI_PROVIDER_${resp.status}: ${detail}`)
          continue
        }
        throw new Error(`AI_PROVIDER_${resp.status}: ${detail}`)
      }
      const data: any = await resp.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text !== 'string' || !text.trim()) throw new Error('AI_EMPTY_RESPONSE')
      return text
    } catch (err) {
      lastErr = err
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('AI_UNKNOWN_ERROR')
}
