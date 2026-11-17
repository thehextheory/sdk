# @thehextheory/cli

Write a [The Hex Theory](https://github.com/thehextheory/sdk) brand scale as CSS variables, or as a Tailwind v4 `@theme` block. One color in, a light theme and a dark theme out.

```bash
npx @thehextheory/cli --color #ff6347 --name tomato --out src/tomato.css
```

Or install it as a dev dependency and call the `thehextheory` command:

```bash
npm install -D @thehextheory/cli
thehextheory --color tomato --name tomato --theme --out src/theme.css
```

## Options

| Flag | |
| --- | --- |
| `--color` | Required. `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, or a CSS color name. |
| `--name` | Variable prefix. Default `brand`. Letters and digits are kept, other characters become hyphens, and an empty result becomes `brand`. `Tomato!` becomes `tomato`. |
| `--out` | File to write. Parent directories are created. Without this flag, the CSS is printed to stdout. |
| `--theme` | Write `@theme { ... }` instead of `:root { ... }`. The tokens are the same. |

The prefix is the name, so `tomato` produces `--color-tomato-500` and `--color-tomato-text-dark`.

## What tomato writes

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

Steps 50–950 keep tomato's hue and drop its lightness down the ramp. The roles are ready to use: surface, border, text, muted, and accent, each for light and dark. Text meets WCAG AA 4.5:1 on its surface. Muted meets 3:1. The accent is the color you passed in, unless that color fails 3:1 on the dark surface, in which case a lighter step is used.

The scale itself comes from [`@thehextheory/core`](https://www.npmjs.com/package/@thehextheory/core). Use the library when you want the colors in JavaScript instead of a CSS file.

Node 20 or newer. MIT License.
