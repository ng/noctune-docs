import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { Diagram } from '@/components/diagram'

export function useMDXComponents(components?: Readonly<MDXComponents>): MDXComponents {
  return getDocsMDXComponents({
    Diagram,
    ...components,
  })
}
