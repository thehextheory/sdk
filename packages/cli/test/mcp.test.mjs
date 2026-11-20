import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createMcpServer } from '../dist/mcp.js'

test('check_contrast reports black on white as AA and AAA', async () => {
  const client = new Client({ name: 'thehextheory-test', version: '0.0.0' })
  const server = createMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  const result = await client.callTool({
    name: 'check_contrast',
    arguments: { foreground: '#000000', background: '#ffffff' },
  })
  assert.equal(result.isError, undefined)
  const text = result.content[0].text
  const report = JSON.parse(text)
  assert.equal(report.foreground, '#000000')
  assert.equal(report.background, '#ffffff')
  assert.equal(report.ratio, 21)
  assert.equal(report.aa, true)
  assert.equal(report.aaa, true)
  await client.close()
  await server.close()
})

test('match_token names a nested Tailwind config color by its path', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'thehextheory-tokens-'))
  writeFileSync(
    join(dir, 'tailwind.config.js'),
    "export default { theme: { extend: { colors: { brand: { DEFAULT: '#ff2040', 900: '#450010' } } } } }\n",
  )
  const previous = process.cwd()
  process.chdir(dir)
  const client = new Client({ name: 'thehextheory-test', version: '0.0.0' })
  const server = createMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  try {
    const result = await client.callTool({ name: 'match_token', arguments: { color: '#460011' } })
    const report = JSON.parse(result.content[0].text)
    assert.equal(report.source, 'project')
    assert.equal(report.name, 'brand-900')
  } finally {
    process.chdir(previous)
    await client.close()
    await server.close()
  }
})

test('an unknown color is a tool error', async () => {
  const client = new Client({ name: 'thehextheory-test', version: '0.0.0' })
  const server = createMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  const result = await client.callTool({
    name: 'check_contrast',
    arguments: { foreground: 'not-a-color', background: 'white' },
  })
  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /Not a color/)
  await client.close()
  await server.close()
})
