---
type: Authoring Guide
title: Open Knowledge Format
description: Author and maintain the noctune documentation as an OKF v0.2 knowledge bundle.
---

# Open Knowledge Format

We use [Google Cloud's OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).
The [Google Cloud introduction](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) explains the original v0.1 release; this repository targets the current v0.2 spec.
Authored documentation has YAML frontmatter with a nonempty `type`, `title`, and
`description`. OKF requires `type`; the other two are our authoring requirements for
discovery. Preserve any existing metadata when editing a document.

## Scope and source of truth

All Markdown in this documentation repository is covered: root instructions and
readmes, product guides, reference pages, tutorial plans, marketing instructions,
and social drafts. The source website remains MDX so its real screenshots, videos,
and diagrams still render. Every source document is exported to standard Markdown
in the [knowledge bundle](../knowledge/index.md). Do not author a second copy there.

`pnpm okf:build` converts MDX components to Markdown images, video links, Mermaid
fences, and text. It preserves code blocks and rewrites internal page links to
bundle-relative concept links. Unsupported components fail explicitly rather than
silently dropping content. Assets remain links to the website; the bundle's text
and concept graph can be read without JavaScript or a running website.

Website landing pages such as `content/index.mdx` become `overview.md` concepts.
OKF reserves `index.md` for directory listings; each generated directory has one,
and only the root index declares `okf_version: "0.2"`.

## Authoring workflow

1. Edit the source document and keep each page focused on a coherent topic.
2. Include `type`, `title`, and a useful one-sentence `description`. Use types such
   as `User Guide`, `Reference`, `Tutorial`, `Runbook`, or `Social Post`.
3. Link related concepts using ordinary Markdown links. Keep public page routes
   stable and preserve existing anchors.
4. Check product behavior against current Core code and UI. Record specific
   sources when adding behavior claims. Never invent human review, verification
   dates, or freshness claims for unchanged content.
5. Run `pnpm okf:build`, then `pnpm check`. Commit source and generated bundle
   together. CI checks the whole source inventory and rejects missing metadata or
   stale generated content, including newly added pages.

Optional `sources`, `generated`, `verified`, `status`, and `stale_after` fields must
follow the upstream spec when used. Formatting validation proves structure, not
that a product claim has been clinically or independently reviewed. Historical
plans and draft posts remain historical plans and drafts after conversion.

## Agent entry point

Start at [the bundle index](../knowledge/index.md), then follow the relevant topic
links. Read `AGENTS.md` for repository workflow and screenshot rules. `CLAUDE.md`
imports those same instructions so future Codex and Claude edits maintain OKF.
