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

## Audit

From a project directory:

```bash
npx @thehextheory/cli audit
npx @thehextheory/cli audit --ci
```

The command reads `.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.ts`, and `.js`. It skips `node_modules`, `dist`, `.git`, and `coverage`. Every `#rgb` and `#rrggbb` literal is listed with its file and line. A violation is a `color` and a `background` (or `background-color`) in the same CSS declaration or JSX style object whose contrast is under 4.5:1. The report includes a replacement foreground hex. Files are not rewritten.

Comments, strings, regex literals, and template literals are skipped while matching braces. A hex is listed when it sits in a CSS declaration value or a JavaScript string; selectors such as `#add`, comments such as `fixes #123`, and entities such as `&#123;` are left out. When a block sets `color` or `background` twice, the last value wins, as in CSS. A pair whose background is a gradient or a variable is not judged. `--ci` exits 1 when a violation exists.

## MCP

```json
{
  "mcpServers": {
    "thehextheory": {
      "command": "npx",
      "args": ["-y", "@thehextheory/cli", "mcp"]
    }
  }
}
```

`check_contrast` returns the WCAG ratio, AA and AAA, and APCA Lc. `fix_contrast` returns a foreground hex that reaches the target ratio, 4.5 by default. `generate_scale` returns the 50–950 ramp; `theme: true` returns the `@theme` block. `match_token` returns the nearest `--color-*` or Tailwind config color in the working directory, or the nearest Tailwind step and CSS name when the directory has none.

Node 20 or newer. MIT License.
