/**
 * iOS line markers.
 *
 * The canonical legal documents in noctune-core annotate commercially
 * worded lines with `<!-- ios-line: replacement -->` so the support-only
 * iOS presentation can omit plan/pricing/billing copy (App Store
 * guideline 3.1.3(f)) while the web renders the canonical text unchanged
 * (HTML comments are invisible there).
 *
 * A line carrying a marker is replaced entirely by the marker content; an
 * empty marker (`<!-- ios-line: -->`) drops the line. noctune-swift's
 * scripts/sync-legal.sh applies the same transform to the bundled in-app
 * copies — keep the two implementations in sync.
 */
const IOS_LINE_MARKER = /<!-- ios-line:([\s\S]*?)-->/

export function applyIosLineMarkers(markdown: string): string {
  return markdown
    .split('\n')
    .flatMap((line) => {
      const match = line.match(IOS_LINE_MARKER)
      if (!match) return [line]
      const replacement = match[1].trim()
      return replacement ? [replacement] : []
    })
    .join('\n')
}
