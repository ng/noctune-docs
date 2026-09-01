import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import { DocsFooter } from '../../components/footer'
import { Logo } from '../../components/logo'

export const metadata: Metadata = {
  title: {
    default: 'noctune Docs',
    template: '%s — noctune Docs',
  },
  description: 'User guides and technical reference for noctune.',
}

const banner = <Banner storageKey="noctune-docs-launch">noctune docs are in preview.</Banner>

const navbar = <Navbar logo={<Logo />} />

const footer = (
  <Footer>
    <DocsFooter />
  </Footer>
)

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      banner={banner}
      navbar={navbar}
      footer={footer}
      pageMap={await getPageMap()}
      docsRepositoryBase="https://github.com/ng/noctune-docs/tree/main"
      editLink=""
      feedback={{
        content: 'Question? Give us feedback',
        link: 'mailto:jon@noctune.ai?subject=noctune%20Docs%20Feedback',
      }}
      nextThemes={{ defaultTheme: 'light' }}
    >
      {children}
    </Layout>
  )
}
