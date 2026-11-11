import Image from 'next/image'
import { CHROME_WEB_STORE_URL } from '../lib/chrome-web-store'

const BADGE_ASPECT_RATIO = 340 / 96

interface ChromeWebStoreBadgeProps {
  height?: number
  /** `bordered` is Google's version for colored or dark backgrounds. */
  variant?: 'standard' | 'bordered'
  className?: string
}

/**
 * Official “Available in the Chrome Web Store” badge linked to the noctune extension.
 *
 * Renders Google's supplied artwork unmodified at its original aspect ratio, as the
 * Chrome Web Store branding guidelines require: the standard badge on white backgrounds
 * and the bordered one on colored backgrounds.
 */
export function ChromeWebStoreBadge({
  height = 40,
  variant = 'standard',
  className,
}: ChromeWebStoreBadgeProps) {
  return (
    <a
      href={CHROME_WEB_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <Image
        src={
          variant === 'bordered'
            ? '/chrome-web-store-badge-bordered.png'
            : '/chrome-web-store-badge.png'
        }
        alt="Available in the Chrome Web Store"
        width={Math.round(height * BADGE_ASPECT_RATIO)}
        height={height}
        style={{ height, width: 'auto' }}
        unoptimized
      />
    </a>
  )
}
