import { applyIosLineMarkers } from './ios-line-markers'

export type LegalDocumentId = 'privacy' | 'terms' | 'ca-privacy' | 'do-not-sell'

const LEGAL_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    source: 'https://app.noctune.ai/legal/privacy-policy.md',
  },
  terms: {
    title: 'Terms of Service',
    source: 'https://app.noctune.ai/legal/terms-of-service.md',
  },
  'ca-privacy': {
    title: 'California Privacy Notice',
    source: 'https://app.noctune.ai/legal/ca-privacy-notice.md',
  },
  'do-not-sell': {
    title: 'Do Not Sell or Share My Personal Information',
    source: 'https://app.noctune.ai/legal/do-not-sell.md',
  },
} as const satisfies Record<LegalDocumentId, { title: string; source: string }>

export async function getLegalDocument(id: LegalDocumentId) {
  const document = LEGAL_DOCUMENTS[id]
  try {
    const response = await fetch(document.source, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Unable to load canonical ${id} document (${response.status})`)
    }

    const raw = await response.text()
    if (!raw.trim()) {
      throw new Error(`Canonical ${id} document was empty`)
    }

    return { ...document, markdown: applyIosLineMarkers(raw), available: true as const }
  } catch (error) {
    console.error(`Unable to render canonical ${id} document`, error)
    return { ...document, markdown: '', available: false as const }
  }
}
