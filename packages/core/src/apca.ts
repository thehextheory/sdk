import type { RGB } from './rgb.js'

function channelY(channel: number): number {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function luminance({ r, g, b }: RGB): number {
  return 0.2126729 * channelY(r) + 0.7151522 * channelY(g) + 0.072175 * channelY(b)
}

const BLACK_THRESHOLD = 0.022
const BLACK_CLAMP = 1.414
const LO_CLIP = 0.1
const LO_OFFSET = 0.027
const DELTA_Y_MIN = 0.0005

function softenBlack(y: number): number {
  if (y > BLACK_THRESHOLD) return y
  return y + (BLACK_THRESHOLD - y) ** BLACK_CLAMP
}

/** APCA 0.0.98G-4g lightness contrast. Positive Lc is dark text on a lighter background. */
export function apcaLc(text: RGB, background: RGB): number {
  const textY = softenBlack(luminance(text))
  const backgroundY = softenBlack(luminance(background))
  if (Math.abs(backgroundY - textY) < DELTA_Y_MIN) return 0

  if (backgroundY > textY) {
    const sapc = (backgroundY ** 0.56 - textY ** 0.57) * 1.14
    return (sapc < LO_CLIP ? 0 : sapc - LO_OFFSET) * 100
  }

  const sapc = (backgroundY ** 0.65 - textY ** 0.62) * 1.14
  return (sapc > -LO_CLIP ? 0 : sapc + LO_OFFSET) * 100
}
