#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { cssVarBlock, interfaceTheme, parseColor, themeBlock, tonalScale } from '@thehextheory/core'

function value(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  const next = process.argv[index + 1]
  if (!next || next.startsWith('--')) return undefined
  return next
}

function scaleToken(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'brand'
}

const color = value('color')
if (!color) {
  console.error('Usage: thehextheory --color #ff2040 [--name brand] [--out src/brand.css] [--theme]')
  process.exit(1)
}

const rgb = parseColor(color)
if (!rgb) {
  console.error(`Not a color: ${color}`)
  process.exit(1)
}

const name = scaleToken(value('name') ?? 'brand')
const steps = tonalScale(rgb)
const theme = interfaceTheme(steps, rgb)
const text = process.argv.includes('--theme') ? themeBlock(name, steps, theme) : cssVarBlock(name, steps, theme)
const body = `${text}\n`
const out = value('out')
if (!out) {
  process.stdout.write(body)
} else {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, body)
}
