// Vercel serverless function: GET /api/health
// Confirms the backend is live and reports which AI model is configured.
// It deliberately never returns the API key — only whether one is present.

export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    service: 'caseforge',
    aiConfigured: Boolean(process.env.AI_API_KEY),
    model: process.env.AI_MODEL ?? 'not-configured',
    time: new Date().toISOString(),
  })
}
