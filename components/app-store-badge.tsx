import Image from 'next/image'
import { IOS_APP_STORE_URL } from '../lib/ios-support'

const BADGE_ASPECT_RATIO = 119.66407 / 40

interface AppStoreBadgeProps {
  height?: number
  className?: string
}

/**
 * Official “Download on the App Store” badge linked to the Noctune iOS listing.
 *
 * Renders Apple's supplied artwork unmodified and preserves its aspect ratio, as
 * the App Store marketing guidelines require.
 */
export function AppStoreBadge({ height = 40, className }: AppStoreBadgeProps) {
  return (
    <a
      href={IOS_APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <Image
        src="/app-store-badge.svg"
        alt="Download on the App Store"
        width={Math.round(height * BADGE_ASPECT_RATIO)}
        height={height}
        style={{ height, width: 'auto' }}
        unoptimized
      />
    </a>
  )
}
