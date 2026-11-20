import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { contrastRatio, fixContrast, parseColor, toHex } from '@thehextheory/core'
import { scanSource, styleRanges } from './scan.js'

const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage'])
const EXT = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.css', '.ts', '.js'])
const AA = 4.5

type Hit = { file: string; line: number; hex: string }
type Violation = Hit & { background: string; ratio: number; fix: string }

export function runAudit(root: string, ci: boolean): number {
  const hexes: Hit[] = []
  const violations: Violation[] = []
  walk(root, root, hexes, violations)
  process.stdout.write(report(hexes, violations))
  return ci && violations.length > 0 ? 1 : 0
}

function report(hexes: Hit[], violations: Violation[]): string {
  const lines = ['hexes']
  if (hexes.length === 0) lines.push('  none')
  for (const hit of hexes) lines.push(`  ${hit.file}:${hit.line}  ${hit.hex}`)
  lines.push('', 'violations')
  if (violations.length === 0) lines.push('  none')
  for (const hit of violations) {
    lines.push(`  ${hit.file}:${hit.line}  ${hit.hex} on ${hit.background}  ${hit.ratio}:1  fix ${hit.fix}`)
  }
  return `${lines.join('\n')}\n`
}

function walk(dir: string, root: string, hexes: Hit[], violations: Violation[]): void {
  let entries: string[]
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
    if (info.isDirectory()) {
      walk(path, root, hexes, violations)
      continue
    }
    const dot = entry.lastIndexOf('.')
    const ext = dot === -1 ? '' : entry.slice(dot)
    if (!EXT.has(ext)) continue
    readSource(path, display(relative(root, path)), ext, hexes, violations)
  }
}

function readSource(path: string, file: string, ext: string, hexes: Hit[], violations: Violation[]): void {
  const text = readFileSync(path, 'utf8')
  const css: [number, number][] = ext === '.css' ? [[0, text.length]] : ext === '.vue' || ext === '.svelte' ? styleRanges(text) : []
  const scan = scanSource(text, css)
  const lineAt = lineIndex(text)
  for (const hit of scan.hexes) hexes.push({ file, line: lineAt(hit.index), hex: hit.hex })
  for (const pair of scan.pairs) {
    const foreground = parseColor(pair.color)
    const behind = parseColor(pair.background)
    if (!foreground || !behind) continue
    const ratio = contrastRatio(foreground, behind)
    if (ratio >= AA) continue
    violations.push({
      file,
      line: lineAt(pair.index),
      hex: toHex(foreground),
      background: toHex(behind),
      ratio: Math.round(ratio * 100) / 100,
      fix: toHex(fixContrast(foreground, behind)),
    })
  }
}

function lineIndex(text: string): (index: number) => number {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return (index) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (starts[mid] <= index) low = mid
      else high = mid - 1
    }
    return low + 1
  }
}

function display(file: string): string {
  return file.split('\\').join('/')
}
