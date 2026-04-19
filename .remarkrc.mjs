import remarkMdx from 'remark-mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkPresetLintRecommended from 'remark-preset-lint-recommended'
import remarkLintNoDeadUrls from 'remark-lint-no-dead-urls'

export default {
  plugins: [
    remarkMdx,
    remarkFrontmatter,
    remarkMdxFrontmatter,
    remarkPresetLintRecommended,
    [
      remarkLintNoDeadUrls,
      {
        skipUrlPatterns: ['^https?://placecats\\.com', '^https?://localhost', '^#'],
      },
    ],
  ],
}
