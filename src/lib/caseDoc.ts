// The document the editor edits, and the shape export / (later) AI consume.

export type Side = 'PRO' | 'CON'

export interface Evidence {
  text: string
  citation: string
  url?: string
}

export interface Contention {
  id: string
  title: string
  claim: string
  warrant: string
  evidence: Evidence[]
  impact: string
}

export interface Definition {
  term: string
  definition: string
  source?: string
}

export interface CaseDoc {
  id: string
  title: string
  resolution: string
  side: Side
  createdAt: string
  updatedAt: string
  framework: string
  definitions: Definition[]
  contentions: Contention[]
  settings: { targetWordCount: number }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function newContention(): Contention {
  return { id: newId(), title: '', claim: '', warrant: '', evidence: [], impact: '' }
}

export function newCase(): CaseDoc {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: 'Untitled case',
    resolution: '',
    side: 'PRO',
    createdAt: now,
    updatedAt: now,
    framework: '',
    definitions: [],
    contentions: [newContention()],
    settings: { targetWordCount: 750 },
  }
}

// Everything a debater would actually say out loud, for word/time estimates.
export function speakableText(doc: CaseDoc): string {
  const parts: string[] = [doc.framework]
  for (const c of doc.contentions) {
    parts.push(c.title, c.claim, c.warrant, ...c.evidence.map((e) => e.text), c.impact)
  }
  return parts.filter(Boolean).join(' ')
}

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

// ~150 words per minute is a reasonable spoken-debate pace.
export function estimateSeconds(words: number): number {
  return Math.round((words / 150) * 60)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
