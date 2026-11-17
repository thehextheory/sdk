import { cssPalette } from './cssNames.js'
import { deltaE2000 } from './deltaE.js'
import type { RGB } from './rgb.js'
import { rgbToLab } from './spaces.js'
import { tailwindFamilies } from './tailwind.js'

export type PaletteMatch = { name: string; rgb: RGB; deltaE: number }

function closest(rgb: RGB, candidates: { name: string; rgb: RGB }[]): PaletteMatch {
  const source = rgbToLab(rgb)
  let best: PaletteMatch | null = null
  for (const candidate of candidates) {
    const deltaE = deltaE2000(source, rgbToLab(candidate.rgb))
    if (!best || deltaE < best.deltaE) best = { name: candidate.name, rgb: candidate.rgb, deltaE }
  }
  if (!best) throw new Error('No palette colors to match')
  return best
}

/** Nearest CSS named color by CIEDE2000. Aliases such as grey are not separate targets. */
export function nearestCssColor(rgb: RGB): PaletteMatch {
  return closest(rgb, cssPalette())
}

/** Nearest Tailwind step, including black and white, by CIEDE2000. */
export function nearestTailwindStep(rgb: RGB): PaletteMatch {
  const candidates = tailwindFamilies.flatMap((family) =>
    family.stops.map((stop) => ({ name: stop.token, rgb: stop.rgb })),
  )
  candidates.push({ name: 'black', rgb: { r: 0, g: 0, b: 0 } }, { name: 'white', rgb: { r: 255, g: 255, b: 255 } })
  return closest(rgb, candidates)
}
