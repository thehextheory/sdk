const CODE = 0
const STRING = 1
const COMMENT = 2
const OTHER = 3

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
const VALUE_HEX = /^['"`]?(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-fA-F])/
const DECLARATION = /(?<![\w$-])(['"]?)(background-color|backgroundColor|background|color)\1\s*:\s*/gi
const REGEX_AFTER = '(,=:[!&|?{;'

export type Pair = { index: number; color: string; background: string }
export type Scan = { hexes: { index: number; hex: string }[]; pairs: Pair[] }

/**
 * Finds hex literals in color positions and color/background pairs declared directly in the same block.
 * `css` covers ranges read as CSS: no `//` comments, regex literals, or template literals.
 */
export function scanSource(text: string, css: [number, number][]): Scan {
  const kinds = classify(text, css)
  const inCss = (index: number) => css.some(([start, end]) => index >= start && index < end)
  return { hexes: hexes(text, kinds, inCss), pairs: pairs(text, kinds) }
}

/** `<style>` contents in a `.vue` or `.svelte` file. */
export function styleRanges(text: string): [number, number][] {
  const ranges: [number, number][] = []
  for (const match of text.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/gi)) {
    const start = (match.index ?? 0) + match[1].length
    ranges.push([start, start + match[2].length])
  }
  return ranges
}

function classify(text: string, css: [number, number][]): Uint8Array {
  const kinds = new Uint8Array(text.length)
  const inCss = (index: number) => css.some(([start, end]) => index >= start && index < end)
  let previous = ''

  const code = (start: number, nested: boolean): number => {
    let depth = 0
    let i = start
    while (i < text.length) {
      const c = text[i]
      const next = text[i + 1]
      const cssHere = inCss(i)
      if (c === '/' && next === '*') {
        i = fill(i, until(text.indexOf('*/', i + 2), 2), COMMENT)
      } else if (!cssHere && c === '/' && next === '/') {
        i = fill(i, until(text.indexOf('\n', i), 0), COMMENT)
      } else if (c === '"' || c === "'") {
        i = quoted(i, c)
        previous = c
      } else if (!cssHere && c === '`') {
        i = template(i)
        previous = c
      } else if (!cssHere && c === '/' && (previous === '' || REGEX_AFTER.includes(previous))) {
        i = regex(i)
        previous = '/'
      } else {
        if (nested && c === '{') depth++
        if (nested && c === '}') {
          if (depth === 0) return i
          depth--
        }
        if (!/\s/.test(c)) previous = c
        i++
      }
    }
    return i
  }

  const until = (found: number, length: number) => (found === -1 ? text.length : found + length)

  const fill = (start: number, end: number, kind: number): number => {
    kinds.fill(kind, start, end)
    return end
  }

  const quoted = (start: number, quote: string): number => {
    let j = start + 1
    while (j < text.length && text[j] !== quote && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1
    fill(start + 1, Math.min(j, text.length), STRING)
    return text[j] === quote ? j + 1 : j
  }

  const template = (start: number): number => {
    let j = start + 1
    let segment = j
    while (j < text.length) {
      if (text[j] === '\\') {
        j += 2
      } else if (text[j] === '`') {
        fill(segment, j, STRING)
        return j + 1
      } else if (text[j] === '$' && text[j + 1] === '{') {
        fill(segment, j, STRING)
        fill(j, j + 2, OTHER)
        const end = code(j + 2, true)
        if (end < text.length) kinds[end] = OTHER
        j = end + 1
        segment = j
      } else {
        j++
      }
    }
    fill(segment, text.length, STRING)
    return text.length
  }

  const regex = (start: number): number => {
    let j = start + 1
    let inClass = false
    while (j < text.length && text[j] !== '\n') {
      const c = text[j]
      if (c === '\\') {
        j += 2
        continue
      }
      if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) {
        j++
        while (/[a-z]/i.test(text[j] ?? '')) j++
        return fill(start, j, OTHER)
      }
      j++
    }
    return start + 1
  }

  code(0, false)
  return kinds
}

function hexes(text: string, kinds: Uint8Array, inCss: (index: number) => boolean): Scan['hexes'] {
  const found: Scan['hexes'] = []
  for (const match of text.matchAll(HEX)) {
    const index = match.index ?? 0
    if (/[\w&]/.test(text[index - 1] ?? '')) continue
    const counted = inCss(index) ? kinds[index] === CODE && cssValue(text, kinds, index) : kinds[index] === STRING
    if (counted) found.push({ index, hex: match[0].toLowerCase() })
  }
  return found
}

/** A CSS hex counts after a `:` in a declaration, and never in a selector. */
function cssValue(text: string, kinds: Uint8Array, index: number): boolean {
  let colon = false
  for (let j = index - 1; j >= 0; j--) {
    if (kinds[j] !== CODE) continue
    if (text[j] === ':') colon = true
    if ('{;}'.includes(text[j])) break
  }
  for (let j = index + 1; j < text.length; j++) {
    if (kinds[j] !== CODE || !'{;}'.includes(text[j])) continue
    if (text[j] === '{') return false
    break
  }
  return colon
}

function pairs(text: string, kinds: Uint8Array): Pair[] {
  const owner = new Int32Array(text.length).fill(-1)
  const stack: number[] = []
  let blocks = 0
  for (let i = 0; i < text.length; i++) {
    if (kinds[i] === CODE && text[i] === '{') stack.push(blocks++)
    owner[i] = stack.length > 0 ? stack[stack.length - 1] : -1
    if (kinds[i] === CODE && text[i] === '}') stack.pop()
  }

  const latest = new Map<number, { color?: { index: number; hex: string | null }; background?: string | null }>()
  for (const match of text.matchAll(DECLARATION)) {
    const index = match.index ?? 0
    if (kinds[index] !== CODE || owner[index] === -1) continue
    const value = VALUE_HEX.exec(text.slice(index + match[0].length, index + match[0].length + 8))
    const hex = value ? value[1] : null
    const block = latest.get(owner[index]) ?? {}
    if (match[2].toLowerCase() === 'color') block.color = { index, hex }
    else block.background = hex
    latest.set(owner[index], block)
  }

  const found: Pair[] = []
  for (const block of latest.values()) {
    if (!block.color?.hex || !block.background) continue
    found.push({ index: block.color.index, color: block.color.hex, background: block.background })
  }
  return found.sort((a, b) => a.index - b.index)
}
