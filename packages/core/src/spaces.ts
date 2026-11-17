import { clampByte, type RGB } from './rgb.js'

export type OKLCH = { l: number; c: number; h: number }
export type LAB = { l: number; a: number; b: number }

function linearChannel(channel: number): number {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function fromLinear(channel: number): number {
  const x = Math.min(1, Math.max(0, channel))
  const encoded = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  return clampByte(Math.round(encoded * 255))
}

function linearRgb({ r, g, b }: RGB): [number, number, number] {
  return [linearChannel(r), linearChannel(g), linearChannel(b)]
}

export function rgbToOklch(rgb: RGB): OKLCH {
  const [r, g, b] = linearRgb(rgb)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(a, bb)
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c,
    h: c < 1e-6 ? 0 : h,
  }
}

function oklchToLinear({ l, c, h }: OKLCH): [number, number, number] {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const ll = l + 0.3963377774 * a + 0.2158037573 * b
  const mm = l - 0.1055613458 * a - 0.0638541728 * b
  const ss = l - 0.0894841775 * a - 1.291485548 * b
  const l3 = ll ** 3
  const m3 = mm ** 3
  const s3 = ss ** 3
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

export function oklchInGamut(oklch: OKLCH): boolean {
  return oklchToLinear(oklch).every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)
}

export function oklchToRgb(oklch: OKLCH): RGB {
  const [r, g, b] = oklchToLinear(oklch)
  return { r: fromLinear(r), g: fromLinear(g), b: fromLinear(b) }
}

const LAB_X = 0.95047
const LAB_Z = 1.08883

function labPivot(t: number): number {
  const delta = 6 / 29
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29
}

export function rgbToLab(rgb: RGB): LAB {
  const [r, g, b] = linearRgb(rgb)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / LAB_X
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / LAB_Z
  const fx = labPivot(x)
  const fy = labPivot(y)
  const fz = labPivot(z)
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

export function formatOklch({ l, c, h }: OKLCH): string {
  return `${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)}`
}

export function formatLab({ l, a, b }: LAB): string {
  return `${l.toFixed(1)} ${a.toFixed(1)} ${b.toFixed(1)}`
}
