import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata: Metadata = {
  title: {
    default: 'Noctune Docs',
    template: '%s — Noctune Docs',
  },
  description: 'User guides and API reference for Noctune.',
}

const banner = <Banner storageKey="noctune-docs-launch">Noctune docs are in preview.</Banner>

const navbar = (
  <Navbar
    logo={<b>Noctune</b>}
    projectLink="https://github.com/ng/noctune-docs"
  />
)

const footer = <Footer>© {new Date().getFullYear()} Noctune</Footer>

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/ng/noctune-docs/tree/main"
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
