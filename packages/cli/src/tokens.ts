import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { deltaE2000, parseColor, rgbToLab, toHex, type RGB } from '@thehextheory/core'

const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage'])
const HEX = '#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])'

export type NamedColor = { name: string; rgb: RGB }

export function projectTokens(root: string): NamedColor[] {
  const found: NamedColor[] = []
  walk(root, (file) => {
    const base = basename(file)
    const text = readFileSync(file, 'utf8')
    if (base.endsWith('.css')) collectCss(text, found)
    if (/^tailwind\.config\.(js|ts|mjs|cjs)$/.test(base)) collectConfig(text, found)
  })
  return found
}

export function nearestToken(color: RGB, tokens: NamedColor[]): { name: string; hex: string; deltaE: number } {
  const lab = rgbToLab(color)
  let best = tokens[0]
  let bestDistance = Infinity
  for (const token of tokens) {
    const distance = deltaE2000(lab, rgbToLab(token.rgb))
    if (distance < bestDistance) {
      best = token
      bestDistance = distance
    }
  }
  return { name: best.name, hex: toHex(best.rgb), deltaE: round(bestDistance) }
}

function collectCss(text: string, found: NamedColor[]): void {
  const pattern = new RegExp(`--color-([A-Za-z0-9-]+)\\s*:\\s*(${HEX})`, 'g')
  for (const match of text.matchAll(pattern)) add(found, match[1], match[2])
}

const WRAPPERS = new Set(['theme', 'extend', 'colors'])

function collectConfig(text: string, found: NamedColor[]): void {
  const pattern = new RegExp(`['"]?([A-Za-z0-9_-]+)['"]?\\s*:\\s*(?:(\\{)|['"](${HEX})['"])|\\{|\\}`, 'g')
  const path: (string | null)[] = []
  for (const match of text.matchAll(pattern)) {
    const [whole, key, open, hex] = match
    if (whole === '{') path.push(null)
    else if (whole === '}') path.pop()
    else if (open) path.push(WRAPPERS.has(key) ? null : key)
    else if (hex) add(found, tokenName(path, key), hex)
  }
}

function tokenName(path: (string | null)[], key: string): string {
  const parts = path.filter((part): part is string => part !== null)
  if (key !== 'DEFAULT') parts.push(key)
  return parts.join('-') || key
}

function add(found: NamedColor[], name: string, hex: string): void {
  const rgb = parseColor(hex)
  if (!rgb || found.some((token) => token.name === name && toHex(token.rgb) === toHex(rgb))) return
  found.push({ name, rgb })
}

function walk(dir: string, visit: (file: string) => void): void {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP.has(entry)) continue
    const path = join(dir, entry)
    let info
    try {
      info = statSync(path)
    } catch {
      continue
    }
    if (info.isDirectory()) walk(path, visit)
    else if (entry.endsWith('.css') || /^tailwind\.config\.(js|ts|mjs|cjs)$/.test(entry)) visit(path)
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
