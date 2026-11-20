import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../dist/main.js', import.meta.url))

test('audit --ci exits 1 when a style pair fails 4.5:1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thehextheory-audit-'))
  writeFileSync(
    join(dir, 'Card.tsx'),
    "export const Card = () => <div style={{ color: '#ffffff', backgroundColor: '#eeeeee' }} />\n",
  )
  mkdirSync(join(dir, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(dir, 'node_modules', 'pkg', 'Bad.css'), '.x { color: #fff; background: #fff; }\n')

  assert.throws(
    () => execFileSync(process.execPath, [cli, 'audit', '--ci'], { cwd: dir, encoding: 'utf8' }),
    (error) => {
      assert.equal(error.status, 1)
      assert.match(error.stdout, /Card\.tsx:1/)
      assert.match(error.stdout, /#ffffff on #eeeeee/)
      assert.match(error.stdout, /fix #/)
      assert.doesNotMatch(error.stdout, /node_modules/)
      return true
    },
  )
})

test('strings, comments, regexes, and nested objects do not hide or invent a pair', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thehextheory-audit-'))
  writeFileSync(
    join(dir, 'strings.tsx'),
    [
      'const re = /[{]/',
      'const t = `${re} }`',
      "export const A = () => <p style={{ color: '#777777', content: '}', background: '#ffffff' }} />",
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(dir, 'twice.css'),
    ['/* #123 is an old ticket */', '#add { color: #000000; background: #ffffff; color: #eeeeee; }', ''].join('\n'),
  )
  writeFileSync(
    join(dir, 'nested.ts'),
    [
      '// fixes #456',
      "export const style = { color: '#fafafa', background: '#ffffff', '&:hover': { color: '#000000' } }",
      "const entity = '&#123;'",
      '',
    ].join('\n'),
  )
  writeFileSync(join(dir, 'unknown.css'), '.b { background: #000; color: #000; background: linear-gradient(#fff, #000); }\n')

  const text = execFileSync(process.execPath, [cli, 'audit'], { cwd: dir, encoding: 'utf8' })
  const [hexes, violations] = text.split('\nviolations\n')
  assert.equal(
    violations.trim().split('\n').map((line) => line.trim().split('  ').slice(0, 2).join('  ')).sort().join('\n'),
    [
      'nested.ts:2  #fafafa on #ffffff',
      'strings.tsx:3  #777777 on #ffffff',
      'twice.css:2  #eeeeee on #ffffff',
    ].join('\n'),
  )
  assert.doesNotMatch(hexes, /#123|#456|#add/)
  assert.match(hexes, /twice\.css:2  #eeeeee/)
  assert.match(hexes, /unknown\.css:1  #fff/)
})

test('brand hexes with no failing pair exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thehextheory-audit-'))
  writeFileSync(join(dir, 'brand.css'), ':root { --color-brand-500: #ff2040; }\n')
  const text = execFileSync(process.execPath, [cli, 'audit', '--ci'], { cwd: dir, encoding: 'utf8' })
  assert.match(text, /#ff2040/)
  assert.match(text, /violations\n  none/)
})
