import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Head } from 'nextra/components'
import 'nextra-theme-docs/style.css'
import './global.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.noctune.ai'),
  title: {
    default: 'Noctune Docs',
    template: '%s — Noctune Docs',
  },
  description: 'User guides and technical reference for Noctune.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {children}
        <Analytics />
      </body>
    </html>
  )
}
