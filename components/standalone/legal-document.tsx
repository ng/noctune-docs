import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IOS_SUPPORT_EMAIL } from '../../lib/ios-support'
import { getLegalDocument, type LegalDocumentId } from '../../lib/legal-documents'
import styles from './legal-document.module.css'

const ROUTE_ALIASES: Record<string, string> = {
  '/ca-privacy': '/ios/ca-privacy',
  '/do-not-sell': '/ios/do-not-sell',
  '/privacy': '/ios/privacy',
  '/terms': '/ios/terms',
}

const ALLOWED_INTERNAL_ROUTES = new Set([
  '/ios/support',
  '/ios/privacy',
  '/ios/terms',
  '/ios/ca-privacy',
  '/ios/do-not-sell',
])

function LegalLink({ href = '', children }: ComponentPropsWithoutRef<'a'>) {
  const safeHref = ROUTE_ALIASES[href] ?? href
  const isAllowed =
    ALLOWED_INTERNAL_ROUTES.has(safeHref) || /^mailto:[A-Z0-9._%+-]+@noctune\.com$/i.test(safeHref)

  if (!isAllowed) {
    return <span>{children}</span>
  }

  return <a href={safeHref}>{children}</a>
}

const markdownComponents: Components = {
  a: LegalLink,
}

export async function LegalDocument({ id }: { id: LegalDocumentId }) {
  const document = await getLegalDocument(id)

  return (
    <main id="main-content" className={styles.main}>
      <a className={styles.backLink} href="/ios/support">
        <span aria-hidden="true">←</span> Noctune for iOS Support
      </a>
      {document.available ? (
        <>
          <article className={styles.document} data-legal-document={id}>
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {document.markdown}
            </Markdown>
          </article>
          <p className={styles.sourceNote}>
            This support-only presentation is rendered from Noctune&apos;s current canonical legal
            document.
          </p>
        </>
      ) : (
        <section className={styles.document} data-legal-document-unavailable={id}>
          <h1>{document.title}</h1>
          <p>
            This document is temporarily unavailable. Please try again shortly or email{' '}
            <a href={`mailto:${IOS_SUPPORT_EMAIL}`}>{IOS_SUPPORT_EMAIL}</a> for assistance.
          </p>
        </section>
      )}
    </main>
  )
}

export function LegalPageFallback({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.loading}>{children}</div>
    </main>
  )
}
