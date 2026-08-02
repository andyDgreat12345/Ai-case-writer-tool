// Per-user and site-wide spend caps.
//
// "User" means client IP — the tool is login-free by design, so there is no
// account to meter.
//
// Two storage backends:
//
//  - **Durable (preferred).** If UPSTASH_REDIS_REST_URL and
//    UPSTASH_REDIS_REST_TOKEN are set, counters live in Redis and the caps are
//    genuinely enforced across every request and instance.
//
//  - **In-memory (fallback).** Without those, counters live in the instance.
//    Measured on Vercel, consecutive requests land on *fresh* instances, so the
//    daily counter resets almost every call and the daily cap does not
//    meaningfully bind. It still blunts a hot loop inside one warm instance,
//    and per-request bounds (max_tokens, input caps) still apply — but do not
//    mistake it for a real quota.
//
// Either way, the only hard ceiling on spend is the limit set on the AI
// provider account. Set one.

interface Bucket {
  day: string
  requests: number
  tokens: number
}

const memClients = new Map<string, Bucket>()
let memSite: Bucket = { day: '', requests: 0, tokens: 0 }
const MAX_TRACKED_CLIENTS = 5000

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export function durable(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function limits() {
  return {
    requestsPerDay: envInt('RATE_LIMIT_PER_DAY', 100),
    tokensPerDay: envInt('TOKEN_BUDGET_PER_DAY', 60_000),
    siteTokensPerDay: envInt('SITE_TOKEN_BUDGET_PER_DAY', 2_000_000),
  }
}

// --- Redis (Upstash REST) ---------------------------------------------------

const TTL_SECONDS = 172_800 // two days, so a day's keys expire on their own

async function redis(path: string[]): Promise<any> {
  const url = `${REDIS_URL!.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}`
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    signal: AbortSignal.timeout(4000),
  })
  if (!resp.ok) throw new Error(`REDIS_${resp.status}`)
  return (await resp.json())?.result
}

function keys(id: string) {
  const d = today()
  return {
    req: `cf:${d}:${id}:r`,
    tok: `cf:${d}:${id}:t`,
    site: `cf:${d}:site:t`,
  }
}

// --- Memory -----------------------------------------------------------------

function memBucket(id: string): Bucket {
  const day = today()
  let b = memClients.get(id)
  if (!b || b.day !== day) {
    b = { day, requests: 0, tokens: 0 }
    if (memClients.size >= MAX_TRACKED_CLIENTS) memClients.clear()
    memClients.set(id, b)
  }
  return b
}

function memSiteBucket(): Bucket {
  const day = today()
  if (memSite.day !== day) memSite = { day, requests: 0, tokens: 0 }
  return memSite
}

// --- Public API -------------------------------------------------------------

export interface Usage {
  requests: number
  tokens: number
  siteTokens: number
}

async function read(id: string): Promise<Usage> {
  if (durable()) {
    try {
      const k = keys(id)
      const [r, t, s] = await Promise.all([
        redis(['get', k.req]),
        redis(['get', k.tok]),
        redis(['get', k.site]),
      ])
      return { requests: Number(r) || 0, tokens: Number(t) || 0, siteTokens: Number(s) || 0 }
    } catch {
      // Fall through to memory rather than blocking the coach on a store outage.
    }
  }
  const b = memBucket(id)
  return { requests: b.requests, tokens: b.tokens, siteTokens: memSiteBucket().tokens }
}

export interface QuotaVerdict {
  allowed: boolean
  reason?: string
  usage: Usage
}

export async function checkQuota(id: string): Promise<QuotaVerdict> {
  const l = limits()
  const usage = await read(id)

  if (usage.siteTokens >= l.siteTokensPerDay) {
    return {
      allowed: false,
      reason: "The coach has reached today's site-wide budget. Your writing is saved — try again tomorrow.",
      usage,
    }
  }
  if (usage.requests >= l.requestsPerDay) {
    return {
      allowed: false,
      reason: `You've used all ${l.requestsPerDay} coach requests for today. Your writing is saved — the editor keeps working.`,
      usage,
    }
  }
  if (usage.tokens >= l.tokensPerDay) {
    return {
      allowed: false,
      reason: "You've used today's coaching budget. Your writing is saved — the editor keeps working.",
      usage,
    }
  }
  return { allowed: true, usage }
}

export async function recordRequest(id: string): Promise<void> {
  if (durable()) {
    try {
      const k = keys(id)
      await redis(['incr', k.req])
      await redis(['expire', k.req, String(TTL_SECONDS)])
      return
    } catch {
      // fall through
    }
  }
  memBucket(id).requests += 1
  memSiteBucket().requests += 1
}

export async function recordTokens(id: string, tokens: number): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  if (durable()) {
    try {
      const k = keys(id)
      await Promise.all([
        redis(['incrby', k.tok, String(tokens)]).then(() =>
          redis(['expire', k.tok, String(TTL_SECONDS)]),
        ),
        redis(['incrby', k.site, String(tokens)]).then(() =>
          redis(['expire', k.site, String(TTL_SECONDS)]),
        ),
      ])
      return
    } catch {
      // fall through
    }
  }
  memBucket(id).tokens += tokens
  memSiteBucket().tokens += tokens
}

// Shape returned to the browser so the UI can show what's left — and say
// plainly whether the number is enforced or merely indicative.
export function budgetFrom(usage: Usage) {
  const l = limits()
  return {
    requestsLeft: Math.max(0, l.requestsPerDay - usage.requests),
    requestsPerDay: l.requestsPerDay,
    tokensLeft: Math.max(0, l.tokensPerDay - usage.tokens),
    tokensPerDay: l.tokensPerDay,
    enforced: durable(),
  }
}
