export type LegalDocumentId = 'privacy' | 'terms'

const LEGAL_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    source: 'https://app.noctune.ai/legal/privacy-policy.md',
  },
  terms: {
    title: 'Terms of Service',
    source: 'https://app.noctune.ai/legal/terms-of-service.md',
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

    const markdown = await response.text()
    if (!markdown.trim()) {
      throw new Error(`Canonical ${id} document was empty`)
    }

    return { ...document, markdown, available: true as const }
  } catch (error) {
    console.error(`Unable to render canonical ${id} document`, error)
    return { ...document, markdown: '', available: false as const }
  }
}
