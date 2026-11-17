import type { RGB } from './rgb.js'

function srgbChannel(channel: number): number {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b)
}

export function contrastRatio(a: RGB, b: RGB): number {
  const hi = Math.max(relativeLuminance(a), relativeLuminance(b))
  const lo = Math.min(relativeLuminance(a), relativeLuminance(b))
  return (hi + 0.05) / (lo + 0.05)
}
