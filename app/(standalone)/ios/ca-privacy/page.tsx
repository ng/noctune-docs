import type { Metadata } from 'next'
import { LegalDocument } from '../../../../components/standalone/legal-document'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'California Privacy Notice',
  description: 'Noctune California Privacy Notice in a public, support-only presentation.',
  alternates: {
    canonical: '/ios/ca-privacy',
  },
}

export default function CaliforniaPrivacyPage() {
  return <LegalDocument id="ca-privacy" />
}
