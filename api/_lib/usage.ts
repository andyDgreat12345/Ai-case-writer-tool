// Per-user and site-wide spend caps.
//
// "User" means client IP — the tool is login-free by design, so there is no
// account to meter. Counters live in memory, which means they reset when a
// serverless instance recycles and are not shared across concurrent instances.
// That makes this a cost *dampener*, not an airtight quota: it stops ordinary
// runaway use and accidental loops. The only hard ceiling on spend is the
// limit you set on the AI provider account itself — set one.

interface Bucket {
  day: string
  requests: number
  tokens: number
}

const perClient = new Map<string, Bucket>()
let siteWide: Bucket = { day: '', requests: 0, tokens: 0 }

// Keeps the map from growing without bound on a long-lived instance.
const MAX_TRACKED_CLIENTS = 5000

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

function bucketFor(id: string): Bucket {
  const day = today()
  let b = perClient.get(id)
  if (!b || b.day !== day) {
    b = { day, requests: 0, tokens: 0 }
    if (perClient.size >= MAX_TRACKED_CLIENTS) perClient.clear()
    perClient.set(id, b)
  }
  return b
}

function siteBucket(): Bucket {
  const day = today()
  if (siteWide.day !== day) siteWide = { day, requests: 0, tokens: 0 }
  return siteWide
}

export interface QuotaVerdict {
  allowed: boolean
  reason?: string
  remaining: { requests: number; tokens: number }
}

export function checkQuota(id: string): QuotaVerdict {
  const l = limits()
  const b = bucketFor(id)
  const site = siteBucket()

  const remaining = {
    requests: Math.max(0, l.requestsPerDay - b.requests),
    tokens: Math.max(0, l.tokensPerDay - b.tokens),
  }

  if (site.tokens >= l.siteTokensPerDay) {
    return {
      allowed: false,
      reason: "The coach has reached today's site-wide budget. Your writing is saved — try again tomorrow.",
      remaining,
    }
  }
  if (b.requests >= l.requestsPerDay) {
    return {
      allowed: false,
      reason: `You've used all ${l.requestsPerDay} coach requests for today. Your writing is saved — the editor keeps working.`,
      remaining,
    }
  }
  if (b.tokens >= l.tokensPerDay) {
    return {
      allowed: false,
      reason: "You've used today's coaching budget. Your writing is saved — the editor keeps working.",
      remaining,
    }
  }
  return { allowed: true, remaining }
}

// Called once a request is admitted, so a burst of parallel calls still counts.
export function recordRequest(id: string): void {
  bucketFor(id).requests += 1
  siteBucket().requests += 1
}

export function recordTokens(id: string, tokens: number): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  bucketFor(id).tokens += tokens
  siteBucket().tokens += tokens
}

// Shape returned to the browser so the UI can show what's left.
export function budgetFor(id: string) {
  const l = limits()
  const b = bucketFor(id)
  return {
    requestsLeft: Math.max(0, l.requestsPerDay - b.requests),
    requestsPerDay: l.requestsPerDay,
    tokensLeft: Math.max(0, l.tokensPerDay - b.tokens),
    tokensPerDay: l.tokensPerDay,
  }
}
