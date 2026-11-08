import Image from 'next/image'
import { CHROME_WEB_STORE_URL } from '../lib/chrome-web-store'

const BADGE_ASPECT_RATIO = 496 / 150

interface ChromeWebStoreBadgeProps {
  height?: number
  className?: string
}

/**
 * Official “Available in the Chrome Web Store” badge linked to the noctune extension.
 *
 * Uses Google's bordered artwork for colored backgrounds, unmodified and at its
 * original aspect ratio, as the Chrome Web Store branding guidelines require.
 */
export function ChromeWebStoreBadge({ height = 40, className }: ChromeWebStoreBadgeProps) {
  return (
    <a
      href={CHROME_WEB_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <Image
        src="/chrome-web-store-badge.png"
        alt="Available in the Chrome Web Store"
        width={Math.round(height * BADGE_ASPECT_RATIO)}
        height={height}
        style={{ height, width: 'auto' }}
        unoptimized
      />
    </a>
  )
}
