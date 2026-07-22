import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { DocsFooter } from '../../components/footer'
import { Logo } from '../../components/logo'

const banner = <Banner storageKey="noctune-docs-launch">Noctune docs are in preview.</Banner>

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
        link: 'mailto:jon@noctune.ai?subject=Noctune%20Docs%20Feedback',
      }}
      nextThemes={{ defaultTheme: 'light' }}
    >
      {children}
    </Layout>
  )
}
