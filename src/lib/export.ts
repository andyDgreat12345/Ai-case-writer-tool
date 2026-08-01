import type { CaseDoc } from './caseDoc'

export function toMarkdown(doc: CaseDoc): string {
  const lines: string[] = []
  lines.push(`# ${doc.title || 'Untitled case'}`)
  lines.push('')
  lines.push(`**Resolution:** ${doc.resolution || '—'}`)
  lines.push('')
  lines.push(`**Side:** ${doc.side}`)
  lines.push('')

  if (doc.framework.trim()) {
    lines.push('## Framework')
    lines.push('')
    lines.push(doc.framework)
    lines.push('')
  }

  if (doc.definitions.length) {
    lines.push('## Definitions')
    lines.push('')
    for (const d of doc.definitions) {
      const src = d.source ? ` _(${d.source})_` : ''
      lines.push(`- **${d.term || '—'}:** ${d.definition}${src}`)
    }
    lines.push('')
  }

  doc.contentions.forEach((c, i) => {
    lines.push(`## Contention ${i + 1}${c.title ? `: ${c.title}` : ''}`)
    lines.push('')
    if (c.claim.trim()) {
      lines.push(`**Claim.** ${c.claim}`)
      lines.push('')
    }
    if (c.warrant.trim()) {
      lines.push(`**Warrant.** ${c.warrant}`)
      lines.push('')
    }
    if (c.evidence.length) {
      lines.push('**Evidence.**')
      lines.push('')
      for (const e of c.evidence) {
        const cite = e.citation ? ` (${e.citation})` : ''
        lines.push(`- ${e.text}${cite}`)
      }
      lines.push('')
    }
    if (c.impact.trim()) {
      lines.push(`**Impact.** ${c.impact}`)
      lines.push('')
    }
  })

  return lines.join('\n').trim() + '\n'
}

export function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
