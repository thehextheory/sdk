# @thehextheory/core

OKLCH and CIELAB conversion, WCAG and APCA contrast, CIEDE2000 matching against CSS and Tailwind colors, and an 11-step brand scale with light and dark roles.

No runtime dependencies. ESM, with TypeScript types. Node 20 or newer.

```bash
npm install @thehextheory/core
```

## Turn one color into a theme

```ts
import { parseColor, tonalScale, interfaceTheme, cssVarBlock, themeBlock } from '@thehextheory/core'

const rgb = parseColor('tomato')
if (!rgb) throw new Error('Not a color')

const steps = tonalScale(rgb)
const theme = interfaceTheme(steps, rgb)

cssVarBlock('tomato', steps, theme) // :root { --color-tomato-50: ... }
themeBlock('tomato', steps, theme) // @theme { ... } for Tailwind v4
```

`parseColor` accepts `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, and CSS color names such as `tomato`. It returns `null` when the string is not a color. `toHex` writes lowercase `#rrggbb`.

Tomato (`#ff6347`) produces this scale:

| Step | Hex | Light | Dark |
| --- | --- | --- | --- |
| 50 | `#fff2ef` | surface | text |
| 200 | `#ffbfb2` | border | |
| 400 | `#f95e42` | | muted |
| 600 | `#b11e00` | muted | |
| 800 | `#670d00` | | border |
| 950 | `#220100` | text | surface |

The accent stays `#ff6347` in both modes, because that red already clears 3:1 on the dark surface. Text drawn on the accent is black or white, whichever passes WCAG AA.

## Match a color

Nearest match uses CIEDE2000 in CIELAB. `deltaE` is 0 for the same color and about 2.3 for a just-noticeable difference.

```ts
import { parseColor, nearestCssColor, nearestTailwindStep, deltaE2000, rgbToLab } from '@thehextheory/core'

const tomato = parseColor('#ff6347')!
nearestCssColor(tomato) // tomato, deltaE 0
nearestTailwindStep(tomato) // red-500 (#ef4444), deltaE 8.42

nearestCssColor(parseColor('#ff6348')!) // still tomato

const red = parseColor('#ef4444')!
deltaE2000(rgbToLab(tomato), rgbToLab(red)) // 8.42
```

`nearestCssColor` matches the unique CSS names. Aliases such as `grey` are not a second target. `nearestTailwindStep` walks every family stop plus black and white. `tailwindTokenOf` is the exact match only: it returns `red-500` for `#ef4444` and `null` for tomato.

## Contrast

```ts
import { parseColor, contrastRatio, apcaLc, relativeLuminance } from '@thehextheory/core'

const tomato = parseColor('#ff6347')!
const white = parseColor('#ffffff')!

contrastRatio(tomato, white) // 2.95, below WCAG AA for body text
apcaLc(parseColor('#000000')!, tomato) // about 50.8
relativeLuminance(white) // 1
```

`contrastRatio` is the WCAG 2 ratio, from 1 to 21. `apcaLc` is APCA 0.0.98G-4g. A positive Lc means the text is darker than the background.

## The scale

`tonalScale` keeps the source chroma and hue and sets OKLCH lightness at eleven stops:

| Step | Lightness |
| --- | --- |
| 50 | 0.97 |
| 100 | 0.93 |
| 200 | 0.86 |
| 300 | 0.77 |
| 400 | 0.68 |
| 500 | 0.58 |
| 600 | 0.49 |
| 700 | 0.41 |
| 800 | 0.33 |
| 900 | 0.25 |
| 950 | 0.16 |

Chroma is pulled down until the color fits in sRGB. The step whose lightness is closest to the source is marked `active`.

`interfaceTheme(steps, source)` then picks roles:

| Role | Light | Dark |
| --- | --- | --- |
| Surface | step 50 | step 950 |
| Border | step 200 | step 800 |
| Text | from step 950 toward lighter until WCAG AA 4.5:1 on the surface | from step 50 toward darker until 4.5:1 |
| Muted | from step 600 toward darker until 3:1, skipping the text color | from step 400 toward lighter until 3:1, skipping the text color |
| Accent | the source color | the source, or a lighter step from 500 when the source is under 3:1 on the dark surface |

`accentInk` is black or white, whichever passes AA on the accent. `accessibleVariant(rgb, 'lighter' | 'darker')` walks OKLCH lightness until the color passes AA against black (lighter) or white (darker).

`cssVarBlock(name, steps, theme)` writes a `:root` block. `themeBlock` writes the same declarations inside `@theme`. Role tokens look like `--color-tomato-surface-light`. Pass the steps without a theme and only the eleven steps are written.

## Also exported

| | |
| --- | --- |
| `rgbToOklch`, `oklchToRgb`, `formatOklch` | OKLCH. `formatOklch` prints `69.6% 0.196 32.3` for tomato. |
| `rgbToLab`, `formatLab` | CIELAB, D65. |
| `namedColor`, `cssNameOf`, `cssPalette`, `cssColors` | The CSS named colors. `cssNameOf` is an exact hex match. |
| `tailwindFamilies` | 22 families, each with 11 stops, in `#rrggbb`. |
| `deltaE2000` | CIEDE2000 between two `LAB` values. |

Source and issues: [thehextheory/sdk](https://github.com/thehextheory/sdk). MIT License.
