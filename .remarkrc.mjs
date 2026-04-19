import remarkMdx from 'remark-mdx'
import remarkPresetLintRecommended from 'remark-preset-lint-recommended'
import remarkLintNoDeadUrls from 'remark-lint-no-dead-urls'

export default {
  plugins: [
    remarkMdx,
    remarkPresetLintRecommended,
    [
      remarkLintNoDeadUrls,
      {
        skipUrlPatterns: ['^https?://placecats\\.com', '^https?://localhost', '^#'],
      },
    ],
    // Nextra-specific: the recommended preset flags raw HTML in MD, but MDX
    // intentionally uses JSX. Allow it.
    ['remark-lint-no-html', false],
  ],
}
