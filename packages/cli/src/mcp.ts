import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import {
  apcaLc,
  contrastRatio,
  cssVarBlock,
  fixContrast,
  interfaceTheme,
  nearestCssColor,
  nearestTailwindStep,
  parseColor,
  themeBlock,
  toHex,
  tonalScale,
} from '@thehextheory/core'
import { scaleToken, textResult, toolError } from './colors.js'
import { nearestToken, projectTokens } from './tokens.js'

const AA = 4.5
const AAA = 7

const tools = [
  {
    name: 'check_contrast',
    description: 'WCAG contrast ratio, AA and AAA, and APCA Lc for two colors.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        foreground: { type: 'string', description: 'Text color: hex, rgb(), or a CSS name.' },
        background: { type: 'string', description: 'Background color: hex, rgb(), or a CSS name.' },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'fix_contrast',
    description: 'Move a foreground color in OKLCH lightness until it reaches a contrast target on a background.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        foreground: { type: 'string' },
        background: { type: 'string' },
        targetRatio: { type: 'number', description: 'WCAG ratio to reach. Defaults to 4.5.' },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'generate_scale',
    description: 'Build the 50–950 brand scale and the light and dark roles for one color.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        color: { type: 'string' },
        name: { type: 'string', description: 'Variable prefix. Defaults to brand.' },
        theme: { type: 'boolean', description: 'Return a Tailwind v4 @theme block instead of :root.' },
      },
      required: ['color'],
    },
  },
  {
    name: 'match_token',
    description:
      'Nearest project color token by CIEDE2000. With no theme in the working directory, returns the nearest Tailwind step and CSS color name.',
    inputSchema: {
      type: 'object' as const,
      properties: { color: { type: 'string' } },
      required: ['color'],
    },
  },
]

export function createMcpServer(): Server {
  const server = new Server({ name: 'thehextheory', version: '0.2.0' }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Args
    if (request.params.name === 'check_contrast') return checkContrast(args)
    if (request.params.name === 'fix_contrast') return fixPair(args)
    if (request.params.name === 'generate_scale') return generateScale(args)
    if (request.params.name === 'match_token') return matchToken(args)
    return toolError(`Unknown tool: ${request.params.name}`)
  })
  return server
}

export async function startMcp(): Promise<void> {
  const server = createMcpServer()
  await server.connect(new StdioServerTransport())
}

type Args = Record<string, unknown>

function checkContrast(args: Args) {
  const colors = pair(args)
  if ('error' in colors) return toolError(colors.error)
  const ratio = contrastRatio(colors.foreground, colors.background)
  return textResult({
    foreground: toHex(colors.foreground),
    background: toHex(colors.background),
    ratio: round(ratio),
    aa: ratio >= AA,
    aaa: ratio >= AAA,
    apca: Math.round(apcaLc(colors.foreground, colors.background)),
  })
}

function fixPair(args: Args) {
  const colors = pair(args)
  if ('error' in colors) return toolError(colors.error)
  const target = typeof args.targetRatio === 'number' && args.targetRatio > 1 ? args.targetRatio : AA
  const fixed = fixContrast(colors.foreground, colors.background, target)
  return textResult({
    foreground: toHex(fixed),
    background: toHex(colors.background),
    ratio: round(contrastRatio(fixed, colors.background)),
    target,
  })
}

function generateScale(args: Args) {
  const color = readColor(args.color, 'color')
  if ('error' in color) return toolError(color.error)
  const name = scaleToken(typeof args.name === 'string' ? args.name : 'brand')
  const steps = tonalScale(color.rgb)
  const theme = interfaceTheme(steps, color.rgb)
  const css = args.theme === true ? themeBlock(name, steps, theme) : cssVarBlock(name, steps, theme)
  return textResult({ name, css })
}

function matchToken(args: Args) {
  const color = readColor(args.color, 'color')
  if ('error' in color) return toolError(color.error)
  const tokens = projectTokens(process.cwd())
  if (tokens.length > 0) return textResult({ source: 'project', ...nearestToken(color.rgb, tokens) })
  const css = nearestCssColor(color.rgb)
  const step = nearestTailwindStep(color.rgb)
  return textResult({
    source: 'palette',
    css: { name: css.name, hex: toHex(css.rgb), deltaE: round(css.deltaE) },
    tailwind: { name: step.name, hex: toHex(step.rgb), deltaE: round(step.deltaE) },
  })
}

function pair(args: Args) {
  const foreground = readColor(args.foreground, 'foreground')
  if ('error' in foreground) return foreground
  const background = readColor(args.background, 'background')
  if ('error' in background) return background
  return { foreground: foreground.rgb, background: background.rgb }
}

function readColor(value: unknown, name: string): { rgb: NonNullable<ReturnType<typeof parseColor>> } | { error: string } {
  if (typeof value !== 'string' || !value.trim()) return { error: `${name} is required` }
  const rgb = parseColor(value)
  if (!rgb) return { error: `Not a color: ${value}` }
  return { rgb }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
