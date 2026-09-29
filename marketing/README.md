# Reusable noctune marketing assets

This folder belongs in noctune-docs because it reuses the tutorial capture fixtures
and rendering tools. It contains upload-ready artwork, official brand sources, and
reproducible layouts. These files are not automatically published to the docs site
or social accounts.

## Upload files

| File in `exports/`                         | Use                                             | Dimensions |
| ------------------------------------------ | ----------------------------------------------- | ---------- |
| `noctune-vetsoftwarehub-hero-1200x630.png` | VetSoftwareHub listing hero                     | 1200 × 630 |
| `noctune-linkedin-cover-1512x256.png`      | LinkedIn Page cover                             | 1512 × 256 |
| `noctune-linkedin-logo-400x400.png`        | LinkedIn Page logo; dark artwork on pale sage   | 400 × 400  |
| `noctune-linkedin-logo-white-400x400.png`  | Alternate Page logo; white artwork on dark blue | 400 × 400  |

All exports are PNGs below 3 MB. LinkedIn dimensions follow the user-supplied
September 28, 2026 specification screenshot. Recheck the destination's current
requirements before a future campaign. The VetSoftwareHub hero follows its 1200 × 630 listing preview, not the wider
editor viewport. The earlier 1600 × 728 draft clipped when the preview used cover-fit.
Keep the full image in each corresponding uploader and inspect its actual preview.
The supplied LinkedIn Page-info preview crops the cover to a much shallower center
strip. Its dedicated layout therefore keeps all foreground artwork within approximately
y=65–192 of the 256-pixel canvas. Inspect both the full cover and a centered 144-pixel
crop after changes; do not enlarge device mockups beyond this band. Keep the text
block at x=320 or farther right so the overlaid LinkedIn Page logo cannot cover
the subtitle in the full Page view.

## Regenerate

```sh
pnpm marketing:render
```

Requires installed dependencies and materialized Git LFS files (`git lfs pull`).
No API keys, capture database, or files from another checkout are needed. An optional
output directory can be passed directly to `node scripts/marketing/render-assets.mjs`.
The renderer checks source hashes, output dimensions, and the 3 MB ceiling, and writes
an export manifest. Inspect the resulting images after every layout or source change.
Run `pnpm check` before committing. Keep raster sources and exports in Git LFS.

## Design and source rules

- Omit the repeated horizontal logo from both the VetSoftwareHub hero and LinkedIn
  cover; the separate listing/Page logo already includes the wordmark. The square uses the complete official
  stacked artwork, including the wordmark. Preserve its proportions, spacing, and
  color; do not reconstruct it from separate owl and text crops.
- Square artwork is 300 pixels wide and centered on a 400 × 400 canvas, leaving
  50 pixels of padding on each side of the wordmark.
- Hero and cover layouts are separate SVG templates in `templates/`. They embed the
  untouched web and iOS captures at render time. Resize proportionally, and clip the
  phone screen to its rounded frame so square capture corners cannot protrude.
- The phone sits slightly below the browser with a soft shadow. In the VetSoftwareHub hero,
  all foreground artwork has at least 90 pixels of edge padding; keep important content
  within the listing crop's safe area. Do not assume that crop applies to LinkedIn.
- Keep the sage background and dark brand colors. Use the supplied
  official App Store badge from `public/app-store-badge.svg` without redrawing,
  recoloring, or stretching it.
- Web review shows the SOAP note, highlighted citation, transcript, and playback.
  iOS shows the actual recording screen. Use fictional fixtures only; do not retouch
  product text, invent controls, or generate substitute product UI.
- `source/manifest.json` records the source hashes, capture revisions, and native
  frame timestamp. To replace a capture, use the documented tutorial capture workflow,
  visually verify it, then update the source and provenance together. Preserve the
  original raw footage outside Git as described in the tutorial workflow.

See [tutorial tooling](../tutorials/README.md) for capture and video generation.
The original source SVG templates use asset placeholders; standalone SVGs containing
embedded raster data are intentionally not checked in. The PNG exports are the files
to upload.
