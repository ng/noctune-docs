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
        // mailto: links can't be fetched, so the dead-URL check can't judge them.
        skipUrlPatterns: ['^https?://localhost', '^#', '^mailto:'],
      },
    ],
  ],
}
