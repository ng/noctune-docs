import Image from 'next/image'
import { CHROME_WEB_STORE_URL } from '../lib/chrome-web-store'

const BADGE_ASPECT_RATIO = 340 / 96
// The App Store badge's own corner radius at 40px tall, so the two badges match.
const BADGE_RADIUS_RATIO = 7 / 40

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
 * and the bordered one on colored backgrounds. Its corners are rounded in CSS to match
 * the App Store badge.
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
        style={{
          display: 'block',
          height,
          width: 'auto',
          borderRadius: height * BADGE_RADIUS_RATIO,
          // The bordered artwork's hairline edge is square, so rounding clips it at the
          // corners; redraw it along the rounded edge in Google's border colour.
          ...(variant === 'bordered' && {
            outline: '1px solid rgba(218, 220, 224, 0.5)',
            outlineOffset: -1,
          }),
        }}
        unoptimized
      />
    </a>
  )
}
