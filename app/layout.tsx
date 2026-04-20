import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './global.css'
import { Logo } from '../components/logo'
import { DocsFooter } from '../components/footer'

export const metadata: Metadata = {
  title: {
    default: 'Noctune Docs',
    template: '%s — Noctune Docs',
  },
  description: 'User guides and technical reference for Noctune.',
}

const banner = <Banner storageKey="noctune-docs-launch">Noctune docs are in preview.</Banner>

const navbar = <Navbar logo={<Logo />} />

const footer = (
  <Footer>
    <DocsFooter />
  </Footer>
)

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head
        color={{
          hue: 175,
          saturation: 50,
          lightness: { light: 33, dark: 60 },
        }}
      />
      <body>
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
      </body>
    </html>
  )
}
