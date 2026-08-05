import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { AppStoreBadge } from '@/components/app-store-badge'
import { BrowserFrame } from '@/components/browser-frame'
import { Diagram } from '@/components/diagram'

/** Extends the Nextra MDX component map with Noctune documentation primitives. */
export function useMDXComponents(components?: Readonly<MDXComponents>): MDXComponents {
  return getDocsMDXComponents({
    AppStoreBadge,
    BrowserFrame,
    Diagram,
    ...components,
  })
}
