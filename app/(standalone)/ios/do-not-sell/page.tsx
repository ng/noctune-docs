import type { Metadata } from 'next'
import { LegalDocument } from '../../../../components/standalone/legal-document'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Do Not Sell or Share My Personal Information',
  description:
    'Noctune Do Not Sell or Share My Personal Information notice in a public, support-only presentation.',
  alternates: {
    canonical: '/ios/do-not-sell',
  },
}

export default function DoNotSellPage() {
  return <LegalDocument id="do-not-sell" />
}
