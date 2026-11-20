import { contrastRatio } from './contrast.js'
import { toHex, type RGB } from './rgb.js'
import { oklchInGamut, oklchToRgb, rgbToOklch, type OKLCH } from './spaces.js'

const BLACK: RGB = { r: 0, g: 0, b: 0 }
const WHITE: RGB = { r: 255, g: 255, b: 255 }
const AA = 4.5

export const TONAL_STEPS: readonly { step: number; l: number }[] = [
  { step: 50, l: 0.97 },
  { step: 100, l: 0.93 },
  { step: 200, l: 0.86 },
  { step: 300, l: 0.77 },
  { step: 400, l: 0.68 },
  { step: 500, l: 0.58 },
  { step: 600, l: 0.49 },
  { step: 700, l: 0.41 },
  { step: 800, l: 0.33 },
  { step: 900, l: 0.25 },
  { step: 950, l: 0.16 },
]

export type TonalStep = { step: number; rgb: RGB; active: boolean }

function inGamutColor(l: number, c: number, h: number): RGB {
  if (oklchInGamut({ l, c, h })) return oklchToRgb({ l, c, h })
  let low = 0
  let high = c
  let best: OKLCH = { l, c: 0, h }
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    const candidate = { l, c: mid, h }
    if (oklchInGamut(candidate)) {
      best = candidate
      low = mid
    } else {
      high = mid
    }
  }
  return oklchToRgb(best)
}

export function tonalScale(rgb: RGB): TonalStep[] {
  const source = rgbToOklch(rgb)
  let activeStep = TONAL_STEPS[0].step
  let closest = Infinity
  for (const stop of TONAL_STEPS) {
    const distance = Math.abs(stop.l - source.l)
    if (distance < closest) {
      closest = distance
      activeStep = stop.step
    }
  }
  return TONAL_STEPS.map((stop) => ({
    step: stop.step,
    rgb: inGamutColor(stop.l, source.c, source.h),
    active: stop.step === activeStep,
  }))
}

const MUTED = 3
const ROLES = ['surface', 'border', 'text', 'muted', 'accent'] as const

export type ThemeMode = {
  surface: RGB
  border: RGB
  text: RGB
  muted: RGB
  accent: RGB
  accentInk: RGB
}

export type InterfaceTheme = { light: ThemeMode; dark: ThemeMode }

export function interfaceTheme(steps: TonalStep[], source: RGB): InterfaceTheme {
  const lightSurface = stepRgb(steps, 50)
  const darkSurface = stepRgb(steps, 950)
  const lightText = roleColor(fromStep(steps, 950, 'up'), lightSurface, AA, 'darker')
  const darkText = roleColor(fromStep(steps, 50, 'down'), darkSurface, AA, 'lighter')
  return {
    light: {
      surface: lightSurface,
      border: stepRgb(steps, 200),
      text: lightText,
      muted: roleColor(fromStep(steps, 600, 'down').filter((rgb) => toHex(rgb) !== toHex(lightText)), lightSurface, MUTED, 'darker'),
      accent: source,
      accentInk: inkFor(source),
    },
    dark: {
      surface: darkSurface,
      border: stepRgb(steps, 800),
      text: darkText,
      muted: roleColor(fromStep(steps, 400, 'up').filter((rgb) => toHex(rgb) !== toHex(darkText)), darkSurface, MUTED, 'lighter'),
      ...accentOnDark(source, steps, darkSurface),
    },
  }
}

export function themeBlock(name: string, steps: TonalStep[], theme?: InterfaceTheme): string {
  return `@theme {\n${tokenLines(name, steps, theme).join('\n')}\n}`
}

export function cssVarBlock(name: string, steps: TonalStep[], theme?: InterfaceTheme): string {
  return `:root {\n${tokenLines(name, steps, theme).join('\n')}\n}`
}

function tokenLines(name: string, steps: TonalStep[], theme?: InterfaceTheme): string[] {
  const lines = steps.map((step) => `  --color-${name}-${step.step}: ${toHex(step.rgb)};`)
  if (!theme) return lines
  for (const mode of ['light', 'dark'] as const) {
    for (const role of ROLES) {
      lines.push(`  --color-${name}-${role}-${mode}: ${toHex(theme[mode][role])};`)
    }
  }
  return lines
}

function stepRgb(steps: TonalStep[], step: number): RGB {
  const found = steps.find((item) => item.step === step)
  if (!found) throw new Error(`Missing tonal step ${step}`)
  return found.rgb
}

/** Steps from a start, walking toward lighter (`up`) or darker (`down`). */
function fromStep(steps: TonalStep[], start: number, direction: 'up' | 'down'): RGB[] {
  const ordered = [...steps].sort((a, b) => a.step - b.step)
  const index = ordered.findIndex((item) => item.step === start)
  const slice = direction === 'down' ? ordered.slice(index) : ordered.slice(0, index + 1).reverse()
  return slice.map((item) => item.rgb)
}

function roleColor(candidates: RGB[], against: RGB, min: number, walk: 'lighter' | 'darker'): RGB {
  for (const color of candidates) {
    if (contrastRatio(color, against) >= min) return color
  }
  return holdContrast(candidates[0], against, walk, min)
}

/** Move OKLCH lightness from a ramp color until contrast against `against` holds. */
function holdContrast(start: RGB, against: RGB, direction: 'lighter' | 'darker', min: number): RGB {
  if (contrastRatio(start, against) >= min) return start
  const source = rgbToOklch(start)
  let low = direction === 'darker' ? 0 : source.l
  let high = direction === 'darker' ? source.l : 1
  let best = inGamutColor(direction === 'darker' ? 0 : 1, source.c, source.h)
  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2
    const candidate = inGamutColor(mid, source.c, source.h)
    if (contrastRatio(candidate, against) >= min) {
      best = candidate
      if (direction === 'darker') low = mid
      else high = mid
    } else if (direction === 'darker') {
      high = mid
    } else {
      low = mid
    }
  }
  return best
}

function accentOnDark(source: RGB, steps: TonalStep[], surface: RGB): { accent: RGB; accentInk: RGB } {
  if (contrastRatio(source, surface) >= MUTED) return { accent: source, accentInk: inkFor(source) }
  const accent = roleColor(fromStep(steps, 500, 'up'), surface, MUTED, 'lighter')
  return { accent, accentInk: inkFor(accent) }
}

function inkFor(background: RGB): RGB {
  const black = contrastRatio(BLACK, background)
  const white = contrastRatio(WHITE, background)
  if (black >= AA && black >= white) return BLACK
  if (white >= AA) return WHITE
  return black >= white ? BLACK : WHITE
}

function passes(rgb: RGB, against: RGB): boolean {
  return contrastRatio(rgb, against) >= AA
}

/**
 * Move the foreground's OKLCH lightness, keeping its hue, until it reaches `target`
 * against `background`. The closer of the lighter and darker results is returned.
 */
export function fixContrast(foreground: RGB, background: RGB, target = AA): RGB {
  if (contrastRatio(foreground, background) >= target) return { ...foreground }
  const lighter = holdContrast(foreground, background, 'lighter', target)
  const darker = holdContrast(foreground, background, 'darker', target)
  const passing = [lighter, darker].filter((color) => contrastRatio(color, background) >= target)
  const pool = passing.length > 0 ? passing : [lighter, darker]
  const sourceL = rgbToOklch(foreground).l
  return pool.reduce((best, color) =>
    Math.abs(rgbToOklch(color).l - sourceL) < Math.abs(rgbToOklch(best).l - sourceL) ? color : best,
  )
}

/** Nearest lighter or darker OKLCH variant that reaches WCAG AA against black or white. */
export function accessibleVariant(rgb: RGB, direction: 'lighter' | 'darker'): RGB {
  const against = direction === 'lighter' ? BLACK : WHITE
  if (passes(rgb, against)) return { ...rgb }

  const source = rgbToOklch(rgb)
  let low = direction === 'darker' ? 0 : source.l
  let high = direction === 'darker' ? source.l : 1
  let best = inGamutColor(direction === 'darker' ? 0 : 1, source.c, source.h)
  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2
    const candidate = inGamutColor(mid, source.c, source.h)
    if (passes(candidate, against)) {
      best = candidate
      if (direction === 'darker') low = mid
      else high = mid
    } else if (direction === 'darker') {
      high = mid
    } else {
      low = mid
    }
  }
  return best
}
