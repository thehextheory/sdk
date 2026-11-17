# The Hex Theory SDK

Perceptual color math and a CLI that writes a brand scale from one color.

`@thehextheory/core` has no runtime dependencies. It converts sRGB to OKLCH and CIELAB, scores WCAG contrast and APCA, finds the nearest CSS or Tailwind color with CIEDE2000, and builds an 11-step ramp with light and dark surface, border, text, muted, and accent roles.

`@thehextheory/cli` writes that ramp as CSS variables, or as a Tailwind v4 `@theme` block.

```bash
npx @thehextheory/cli --color #ff6347 --name tomato --out src/tomato.css
npx @thehextheory/cli --color tomato --name tomato --theme --out src/tomato.css
```

The default output is a `:root` block. `--theme` writes `@theme` instead. The name becomes the variable prefix, so `tomato` produces `--color-tomato-500` and `--color-tomato-surface-light`.
