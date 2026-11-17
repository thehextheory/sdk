# The Hex Theory

Perceptual color tools for a brand that has to work on a light surface and a dark one. This repository publishes two packages.

| Package | |
| --- | --- |
| [`@thehextheory/core`](https://www.npmjs.com/package/@thehextheory/core) | OKLCH, CIELAB, WCAG, APCA, CIEDE2000, and an 11-step brand scale. No runtime dependencies. |
| [`@thehextheory/cli`](https://www.npmjs.com/package/@thehextheory/cli) | Writes that scale as CSS variables, or as a Tailwind v4 `@theme` block. |

## Install

```bash
npm install @thehextheory/core
npm install -D @thehextheory/cli
```

The CLI is also runnable without adding it to a project:

```bash
npx @thehextheory/cli --color #ff6347 --name tomato --out src/tomato.css
```

## A scale from one color

The command above writes a `:root` block. The name becomes the variable prefix, so `tomato` produces `--color-tomato-500` and `--color-tomato-text-light`. `#ff6347` comes out as:

```css
:root {
  --color-tomato-50: #fff2ef;
  --color-tomato-100: #ffe0d9;
  --color-tomato-200: #ffbfb2;
  --color-tomato-300: #ff917b;
  --color-tomato-400: #f95e42;
  --color-tomato-500: #d53a1f;
  --color-tomato-600: #b11e00;
  --color-tomato-700: #8b1500;
  --color-tomato-800: #670d00;
  --color-tomato-900: #450500;
  --color-tomato-950: #220100;
  --color-tomato-surface-light: #fff2ef;
  --color-tomato-border-light: #ffbfb2;
  --color-tomato-text-light: #220100;
  --color-tomato-muted-light: #b11e00;
  --color-tomato-accent-light: #ff6347;
  --color-tomato-surface-dark: #220100;
  --color-tomato-border-dark: #670d00;
  --color-tomato-text-dark: #fff2ef;
  --color-tomato-muted-dark: #f95e42;
  --color-tomato-accent-dark: #ff6347;
}
```

`--theme` writes the same tokens inside `@theme` for Tailwind v4. `--name Tomato!` is sanitized to `tomato`. Leave off `--out` and the CSS is printed to stdout.

## From TypeScript

```ts
import {
  parseColor,
  tonalScale,
  interfaceTheme,
  cssVarBlock,
  nearestCssColor,
  nearestTailwindStep,
} from '@thehextheory/core'

const rgb = parseColor('#ff6347')
if (!rgb) throw new Error('Not a color')

const steps = tonalScale(rgb)
const theme = interfaceTheme(steps, rgb)
cssVarBlock('tomato', steps, theme)

nearestCssColor(rgb) // { name: 'tomato', deltaE: 0 }
nearestTailwindStep(rgb) // { name: 'red-500', rgb: { r: 239, g: 68, b: 68 }, deltaE: 8.42 }
```

`parseColor` accepts `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, and CSS color names.

## How a theme is chosen

The ramp keeps the source color's chroma and hue. Lightness is set at eleven fixed OKLCH stops, from 0.97 at step 50 down to 0.16 at step 950. The stop closest to the source lightness is marked active.

| Role | Light | Dark |
| --- | --- | --- |
| Surface | step 50 | step 950 |
| Border | step 200 | step 800 |
| Text | walking from step 950 until the color reaches WCAG AA 4.5:1 on the surface | walking from step 50 until 4.5:1 |
| Muted | from step 600 toward darker until 3:1, skipping the text color | from step 400 toward lighter until 3:1, skipping the text color |
| Accent | the source color | the source color, or a lighter step from 500 when the source is under 3:1 on the dark surface |

Text on the accent is black or white, whichever passes AA.

## Packages

```
packages/core   the library
packages/cli    the thehextheory command
```

Each package has its own README. That file is what npm shows on the package page. Node 20 or newer. MIT License.
