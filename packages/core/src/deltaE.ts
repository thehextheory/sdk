import type { LAB } from './spaces.js'

const RAD = Math.PI / 180

function hueDegrees(a: number, b: number): number {
  if (Math.hypot(a, b) < 1e-12) return 0
  let hue = (Math.atan2(b, a) * 180) / Math.PI
  if (hue < 0) hue += 360
  return hue
}

/** CIEDE2000 color difference. Zero means the two Lab colors are the same. */
export function deltaE2000(first: LAB, second: LAB): number {
  const c1 = Math.hypot(first.a, first.b)
  const c2 = Math.hypot(second.a, second.b)
  const cBar = (c1 + c2) / 2
  const cBar7 = cBar ** 7
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)))

  const a1 = (1 + g) * first.a
  const a2 = (1 + g) * second.a
  const c1p = Math.hypot(a1, first.b)
  const c2p = Math.hypot(a2, second.b)
  const h1 = hueDegrees(a1, first.b)
  const h2 = hueDegrees(a2, second.b)

  const dL = second.l - first.l
  const dC = c2p - c1p
  let dh = 0
  if (c1p * c2p !== 0) {
    dh = h2 - h1
    if (dh > 180) dh -= 360
    else if (dh < -180) dh += 360
  }
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin((dh / 2) * RAD)

  const lBar = (first.l + second.l) / 2
  const cBarP = (c1p + c2p) / 2
  let hBar = h1 + h2
  if (c1p * c2p !== 0) {
    if (Math.abs(h1 - h2) > 180) {
      hBar = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2
    } else {
      hBar = (h1 + h2) / 2
    }
  } else {
    hBar = hBar / 2
  }

  const t =
    1 -
    0.17 * Math.cos((hBar - 30) * RAD) +
    0.24 * Math.cos(2 * hBar * RAD) +
    0.32 * Math.cos((3 * hBar + 6) * RAD) -
    0.2 * Math.cos((4 * hBar - 63) * RAD)
  const deltaTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2))
  const cBarP7 = cBarP ** 7
  const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + 25 ** 7))
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2)
  const sc = 1 + 0.045 * cBarP
  const sh = 1 + 0.015 * cBarP * t
  const rt = -Math.sin(2 * deltaTheta * RAD) * rc

  const lTerm = dL / sl
  const cTerm = dC / sc
  const hTerm = dH / sh
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm)
}
