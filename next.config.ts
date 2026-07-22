import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

export default withNextra({
  reactStrictMode: true,
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
