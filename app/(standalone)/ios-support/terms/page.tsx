import type { Metadata } from 'next'
import { LegalDocument } from '../../../../components/standalone/legal-document'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Noctune Terms of Service in a public, support-only presentation.',
  alternates: {
    canonical: '/ios-support/terms',
  },
}

export default function TermsOfServicePage() {
  return <LegalDocument id="terms" />
}
