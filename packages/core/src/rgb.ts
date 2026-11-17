import { namedColor } from './cssNames.js'

export type RGB = { r: number; g: number; b: number }

export function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n | 0))
}

export function toHex({ r, g, b }: RGB): string {
  const n = (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b)
  return `#${n.toString(16).padStart(6, '0')}`
}

export function parseColor(input: string): RGB | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null

  const hexMatch = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hexMatch) {
    let h = hexMatch[1]
    if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }

  const rgbMatch = raw.match(
    /^rgba?\(\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})(?:\s*[,/]\s*[\d.]+)?\s*\)$/,
  )
  if (rgbMatch) {
    const r = Number(rgbMatch[1])
    const g = Number(rgbMatch[2])
    const b = Number(rgbMatch[3])
    if (r > 255 || g > 255 || b > 255) return null
    return { r, g, b }
  }

  return namedColor(raw)
}
