import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

export default withNextra({
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  experimental: {
    // Nextra and Twoslash use the TypeScript 6 compatibility API. The standalone
    // `pnpm tsc` check still runs the TypeScript 7 CLI from `@typescript/native`.
    useTypeScriptCli: false,
  },
  async headers() {
    return [
      {
        // Public JSON fetched without credentials by noctune Core's global search,
        // from production, Vercel previews, and localhost alike.
        source: '/search-index.json',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/ios',
        destination: '/ios/support',
        permanent: true,
      },
      {
        source: '/ios-support',
        destination: '/ios/support',
        permanent: true,
      },
      {
        source: '/ios-support/privacy',
        destination: '/ios/privacy',
        permanent: true,
      },
      {
        source: '/ios-support/terms',
        destination: '/ios/terms',
        permanent: true,
      },
    ]
  },
})
