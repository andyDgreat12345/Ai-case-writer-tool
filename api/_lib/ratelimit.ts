// Best-effort per-IP rate limiter. In-memory, so it resets when a serverless
// instance recycles — good enough to blunt abuse and protect the AI budget on a
// hobby project. For strong limits at scale, swap in a shared store (e.g.
// Upstash Redis) behind this same function signature.

const hits = new Map<string, number[]>()

export function clientIp(req: any): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

// Returns true if the request is allowed.
export function allow(ip: string, perMinute: number): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart)
  if (recent.length >= perMinute) {
    hits.set(ip, recent)
    return false
  }
  recent.push(now)
  hits.set(ip, recent)
  return true
}

export function perMinuteLimit(): number {
  const n = Number(process.env.RATE_LIMIT_PER_MIN)
  return Number.isFinite(n) && n > 0 ? n : 10
}

export function maxInputChars(): number {
  const n = Number(process.env.MAX_INPUT_CHARS)
  return Number.isFinite(n) && n > 0 ? n : 6000
}
