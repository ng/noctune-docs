import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { AppStoreBadge } from '@/components/app-store-badge'
import { BrowserFrame } from '@/components/browser-frame'
import { Diagram } from '@/components/diagram'
import { TutorialList, TutorialVideo } from '@/components/tutorial-video'

/** Extends the Nextra MDX component map with noctune documentation primitives. */
export function useMDXComponents(components?: Readonly<MDXComponents>): MDXComponents {
  return getDocsMDXComponents({
    AppStoreBadge,
    BrowserFrame,
    Diagram,
    TutorialList,
    TutorialVideo,
    ...components,
  })
}
