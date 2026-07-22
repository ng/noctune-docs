import Image from 'next/image'
import type { ReactNode } from 'react'
import { IOS_SUPPORT_EMAIL } from '../../lib/ios-support'
import styles from './standalone-layout.module.css'

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-layout="ios-support">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand} aria-label="Noctune iOS Support">
            <Image
              src="/noctune-logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className={styles.logo}
            />
            <div>
              <div className={styles.brandName}>Noctune</div>
              <div className={styles.brandContext}>iOS Support</div>
            </div>
          </div>
          <div className={styles.availability}>Help for existing users</div>
        </div>
      </header>

      {children}

      <footer className={styles.footer} data-support-section="footer">
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerBrand}>Noctune, Inc.</div>
            <div className={styles.copyright}>© {new Date().getFullYear()} Noctune</div>
          </div>
          <nav className={styles.footerLinks} aria-label="iOS support and legal">
            <a href="/ios/support">iOS Support</a>
            <a href="/ios/privacy">Privacy Policy</a>
            <a href="/ios/terms">Terms of Service</a>
            <a href={`mailto:${IOS_SUPPORT_EMAIL}?subject=Noctune%20for%20iOS%20Support`}>
              Email Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
