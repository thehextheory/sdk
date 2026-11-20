#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { cssVarBlock, interfaceTheme, parseColor, themeBlock, tonalScale } from '@thehextheory/core'
import { runAudit } from './audit.js'
import { scaleToken } from './colors.js'
import { startMcp } from './mcp.js'

function value(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  const next = process.argv[index + 1]
  if (!next || next.startsWith('--')) return undefined
  return next
}

const command = process.argv[2]
if (command === 'mcp') {
  await startMcp()
} else if (command === 'audit') {
  process.exit(runAudit(process.cwd(), process.argv.includes('--ci')))
} else {
  const color = value('color')
  if (!color) {
    console.error('Usage: thehextheory --color #ff2040 [--name brand] [--out src/brand.css] [--theme]')
    console.error('       thehextheory mcp')
    console.error('       thehextheory audit [--ci]')
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
}
