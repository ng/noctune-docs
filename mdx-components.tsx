import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { BrowserFrame } from '@/components/browser-frame'
import { Diagram } from '@/components/diagram'

export function useMDXComponents(components?: Readonly<MDXComponents>): MDXComponents {
  return getDocsMDXComponents({
    BrowserFrame,
    Diagram,
    ...components,
  })
}
