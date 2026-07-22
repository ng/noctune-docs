import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getLegalDocument, type LegalDocumentId } from '../../lib/legal-documents'
import styles from './legal-document.module.css'

const ROUTE_ALIASES: Record<string, string> = {
  '/privacy': '/ios-support/privacy',
  '/terms': '/ios-support/terms',
}

const ALLOWED_INTERNAL_ROUTES = new Set([
  '/ios-support',
  '/ios-support/privacy',
  '/ios-support/terms',
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
      <a className={styles.backLink} href="/ios-support">
        <span aria-hidden="true">←</span> Noctune for iOS Support
      </a>
      <article className={styles.document} data-legal-document={id}>
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {document.markdown}
        </Markdown>
      </article>
      <p className={styles.sourceNote}>
        This support-only presentation is rendered from Noctune&apos;s current canonical legal
        document.
      </p>
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
