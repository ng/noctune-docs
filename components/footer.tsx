import Image from 'next/image'
import { AppStoreBadge } from './app-store-badge'

import styles from './footer.module.css'

const BRAND_URL = 'https://noctune.ai'
const APP_URL = 'https://app.noctune.ai'
const LINKEDIN_URL = 'https://www.linkedin.com/company/noctune-ai'

// Same columns, labels, and order as the marketing site's footer.
const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Features', href: `${BRAND_URL}/#features` },
    { label: 'Pricing', href: `${BRAND_URL}/pricing` },
    { label: 'Pay-per-note', href: `${BRAND_URL}/pay-per-note` },
    { label: 'Staff safety', href: `${BRAND_URL}/staff-safety` },
    { label: 'FAQ', href: `${BRAND_URL}/#faq` },
  ],
  Resources: [
    { label: 'For students', href: `${BRAND_URL}/pricing#students` },
    { label: 'Platform / API', href: `${BRAND_URL}/platform` },
    { label: 'Mic & audio guide', href: `${BRAND_URL}/microphone` },
    { label: 'Docs', href: '/' },
  ],
  Account: [
    { label: 'Sign in', href: `${APP_URL}/sign-in` },
    { label: 'Try noctune for free', href: `${APP_URL}/sign-up` },
    { label: 'Email us', href: 'mailto:jon@noctune.ai' },
    { label: 'LinkedIn', href: LINKEDIN_URL },
  ],
  Legal: [
    { label: 'Privacy', href: `${BRAND_URL}/privacy` },
    { label: 'Terms', href: `${BRAND_URL}/terms` },
    { label: 'California Privacy', href: `${BRAND_URL}/ca-privacy` },
    { label: 'Do Not Sell My Info', href: `${BRAND_URL}/do-not-sell` },
  ],
}

export const footerClassName = styles.footer

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
          <div style={{ marginTop: 20 }}>
            <AppStoreBadge height={40} />
          </div>
        </div>

        {Object.entries(FOOTER_LINKS).map(([title, links]) => (
          <div key={title}>
            <span className={styles.heading}>{title}</span>
            <div className={styles.links}>
              {links.map(({ label, href }) => (
                <a key={label} href={href} className={styles.link}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} noctune. All rights reserved.</span>
        <div className={styles.icons}>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="noctune on LinkedIn"
            title="noctune on LinkedIn"
            className={styles.icon}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
            </svg>
          </a>
          <a
            href="mailto:jon@noctune.ai"
            aria-label="Email noctune"
            title="Email noctune"
            className={styles.icon}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
