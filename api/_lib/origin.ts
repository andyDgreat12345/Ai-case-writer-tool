// Same-origin gate for the AI endpoints.
//
// The code is public, so the request shape is public too. Without this, anyone
// can point their own page at this deployment's /api/feedback and spend the
// owner's provider credit. The browser sends Origin on cross-origin POSTs, so
// rejecting foreign origins stops that cheaply.
//
// This is not airtight — a scripted client can forge the header — so it sits
// alongside the rate limits and the provider-side spend limit rather than
// replacing them. It blocks the realistic case: someone else's site calling
// this one's API from a browser.

function allowedList(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function originAllowed(req: any): boolean {
  const allowed = allowedList()
  // Unset means "don't enforce" — self-hosters and local dev work untouched.
  if (allowed.length === 0) return true

  const raw = req.headers?.origin ?? req.headers?.referer ?? ''
  if (!raw) return true // same-origin GET/POST from some clients omits it

  let origin: string
  try {
    origin = new URL(String(raw)).origin.replace(/\/$/, '')
  } catch {
    return false
  }
  return allowed.includes(origin)
}
