import type { Metadata } from 'next'
import { LegalDocument } from '../../../../components/standalone/legal-document'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Noctune Privacy Policy in a public, support-only presentation.',
  alternates: {
    canonical: '/ios-support/privacy',
  },
}

export default function PrivacyPolicyPage() {
  return <LegalDocument id="privacy" />
}
