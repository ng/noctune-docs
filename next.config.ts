import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

export default withNextra({
  reactStrictMode: true,
  experimental: {
    // Nextra and Twoslash use the TypeScript 6 compatibility API. The standalone
    // `pnpm tsc` check still runs the TypeScript 7 CLI from `@typescript/native`.
    useTypeScriptCli: false,
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
