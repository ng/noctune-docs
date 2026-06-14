import { Mermaid } from '@theguild/remark-mermaid/mermaid'

// Single source of truth for Noctune-branded mermaid theming. Every diagram
// in the docs renders through <Diagram> so the teal/green palette stays
// consistent and lives in one place. The hex values mirror app/global.css.
// `theme: base` is forced (rather than mermaid's light/dark auto-swap) so the
// brand colors hold; they're picked to read on both the light (#fafaf8) and
// dark (#0f1011) page backgrounds.
const BRAND_INIT = `%%{init: {'theme':'base','themeVariables':{'primaryColor':'#2a7f78','primaryTextColor':'#ffffff','primaryBorderColor':'#1a5c57','lineColor':'#5bb3ac','secondaryColor':'#1d6e55','secondaryTextColor':'#ffffff','tertiaryColor':'#0f3d3a','tertiaryTextColor':'#ffffff','noteBkgColor':'#e9f3f2','noteTextColor':'#0f3d3a','noteBorderColor':'#2a7f78','fontFamily':'inherit'}}}%%`

export function Diagram({ chart }: { chart: string }) {
  return <Mermaid chart={`${BRAND_INIT}\n${chart.trim()}`} />
}
