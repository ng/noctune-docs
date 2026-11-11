import { Roboto } from 'next/font/google'
import Image from 'next/image'
import { AppStoreBadge } from './app-store-badge'
import { ChromeWebStoreBadge } from './chrome-web-store-badge'

import styles from './footer.module.css'

const BRAND_URL = 'https://www.noctune.ai'
const LINKEDIN_URL = 'https://www.linkedin.com/company/noctune-ai'

// Canonical source: SiteFooter in noctune-marketing
// (src/components/marketing/SiteFooter.tsx). Keep these links, their order and the
// app lines in step with it; marketing's relative links are absolute here.
const PRODUCT_LINKS = [
  { label: 'Features', href: `${BRAND_URL}/#features` },
  { label: 'How it works', href: `${BRAND_URL}/#how-it-works` },
  { label: 'Integrations', href: `${BRAND_URL}/integrations` },
  { label: 'Pricing', href: `${BRAND_URL}/pricing` },
  { label: 'Pay-per-note', href: `${BRAND_URL}/pay-per-note` },
  { label: 'Staff safety', href: `${BRAND_URL}/staff-safety` },
]

const RESOURCE_LINKS = [
  { label: 'Docs', href: '/' },
  { label: 'Mic & audio guide', href: `${BRAND_URL}/microphone` },
  { label: 'FAQ', href: `${BRAND_URL}/#faq` },
  { label: 'Platform / API', href: `${BRAND_URL}/platform` },
  { label: 'For students', href: `${BRAND_URL}/pricing#students` },
]

const LEGAL_LINKS = [
  { label: 'Privacy', href: `${BRAND_URL}/privacy` },
  { label: 'Terms', href: `${BRAND_URL}/terms` },
  { label: 'California Privacy', href: `${BRAND_URL}/ca-privacy` },
  { label: 'Do Not Sell My Info', href: `${BRAND_URL}/do-not-sell` },
]

// The marketing footer's typeface and weights (@fontsource/roboto 400/500/700 there).
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })

export const footerClassName = `${styles.footer} ${roboto.className}`

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className={styles.column}>
      <span className={styles.heading}>{title}</span>
      <div className={styles.links}>
        {links.map(({ label, href }) => (
          <a key={label} href={href} className={styles.link}>
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}

function AppItem({ note, children }: { note: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      <p className={styles.appNote}>{note}</p>
    </div>
  )
}

export function DocsFooter() {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          <Image
            src="/noctune-logo-horizontal-white.png"
            alt="noctune"
            width={452}
            height={120}
            style={{ display: 'block', height: 28, width: 'auto' }}
          />
          <p className={styles.tagline}>AI for veterinary medicine.</p>
          <div className={styles.contact}>
            <a href="mailto:jon@noctune.ai" className={styles.contactLink}>
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2zm-2 0-8 5-8-5zm0 12H4V8l8 5 8-5z" />
              </svg>
              Email us
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactLink}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z" />
              </svg>
              LinkedIn
            </a>
          </div>
        </div>

        <LinkColumn title="Product" links={PRODUCT_LINKS} />

        {/* App Store first; Google's bordered Chrome badge on the dark footer; Windows has no
            store listing, so a plain noctune button (never a store badge or the Windows logo). */}
        <div className={`${styles.column} ${styles.apps}`}>
          <span className={styles.heading}>Get the app</span>
          <div className={styles.appList}>
            <AppItem note="Record visits on your iPhone">
              <AppStoreBadge height={40} />
            </AppItem>
            <AppItem note="For DaySmart Vet, ezyVet, Shepherd">
              <ChromeWebStoreBadge height={40} variant="bordered" />
            </AppItem>
            <AppItem note="For Cornerstone, AVImark">
              <a
                href={`${BRAND_URL}/integrations/windows`}
                className={styles.windows}
                aria-label="Get noctune for Windows"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z" />
                </svg>
                Download for Windows
              </a>
            </AppItem>
          </div>
        </div>

        <LinkColumn title="Resources" links={RESOURCE_LINKS} />
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} noctune. All rights reserved.</span>
        <nav aria-label="Legal" className={styles.legal}>
          {LEGAL_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className={styles.link}>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
