import { ImageZoom } from 'nextra/components'

import imagePolicy from '../capture/image-policy.json'

import styles from './browser-frame.module.css'

interface BrowserFrameProps {
  src: string
  alt: string
  url?: string
  width?: number
  height?: number
}

/**
 * A deliberately browser-neutral frame for product screenshots.
 *
 * The navigation and address bar communicate “web app” without borrowing a
 * specific browser's tabs, traffic-light controls, colors, or iconography.
 */
export function BrowserFrame({
  src,
  alt,
  url = 'app.noctune.ai',
  width = imagePolicy.viewport.width,
  height = imagePolicy.viewport.height,
}: BrowserFrameProps) {
  return (
    <figure className={styles.frame}>
      <div className={styles.toolbar} aria-hidden="true">
        <div className={styles.navigation}>
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none">
            <path d="m9.75 3.5-4.5 4.5 4.5 4.5" />
          </svg>
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none">
            <path d="m6.25 3.5 4.5 4.5-4.5 4.5" />
          </svg>
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none">
            <path d="M12.3 5.4A5 5 0 1 0 13 9" />
            <path d="M9.6 5.4h2.7V2.7" />
          </svg>
        </div>

        <div className={styles.address}>
          <svg className={styles.lock} viewBox="0 0 16 16" fill="none">
            <rect x="3.5" y="7" width="9" height="6.5" rx="2" />
            <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" />
          </svg>
          <span>{url}</span>
        </div>

        <div className={styles.toolbarBalance} />
      </div>

      <div className={styles.viewport}>
        <ImageZoom
          className={styles.image}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </div>
    </figure>
  )
}
