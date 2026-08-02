# Security

## Reporting a problem

This is a personal project. If you find a security issue, please open a GitHub
issue — but **do not include a working exploit, a real API key, or anyone's
personal data** in the report. A short description of the problem is enough.

## Secrets

No API key has ever been committed to this repository. All provider credentials
live in host environment variables and are read only by the serverless functions
in `/api` — never by the frontend bundle. `.env.example` documents variable
*names* with empty values.

If you fork and deploy this, the same rule applies: your key goes in your host's
environment settings, never in the code. `.env` and `.env.local` are gitignored.

## If you deploy a public instance

The AI endpoints cost real money per call, so an open deployment is a spending
liability rather than a data one. Before publishing a URL:

1. **Set a hard spend limit on your AI provider account.** This is the only
   ceiling that cannot be bypassed by anything in this codebase.
2. **Set `ALLOWED_ORIGINS`** to your own domain so other sites cannot call your
   API from a browser.
3. **Configure a shared counter store** (`UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`) if you want the daily per-user caps to actually
   bind. Without one they do not — see the README.

## Known limitations

Stated plainly rather than implied:

- **Rate limiting is per-IP** and the tool is login-free, so users behind a
  shared IP share a budget, and a user with several IPs gets several budgets.
- **The origin check is not airtight.** A scripted client can forge the `Origin`
  header. It stops browser-based abuse from other sites, not a determined script.
- **The fabricated-evidence filter is heuristic.** It catches the citation
  shapes models actually produce — years, attributions, institutions, figures
  absent from your own text — but it is a safety net, not a proof. Verify every
  source you cite regardless.
