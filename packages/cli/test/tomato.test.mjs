import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../dist/main.js', import.meta.url))

const tomatoVars = `:root {
  --color-tomato-50: #fff2ef;
  --color-tomato-100: #ffe0d9;
  --color-tomato-200: #ffbfb2;
  --color-tomato-300: #ff917b;
  --color-tomato-400: #f95e42;
  --color-tomato-500: #d53a1f;
  --color-tomato-600: #b11e00;
  --color-tomato-700: #8b1500;
  --color-tomato-800: #670d00;
  --color-tomato-900: #450500;
  --color-tomato-950: #220100;
  --color-tomato-surface-light: #fff2ef;
  --color-tomato-border-light: #ffbfb2;
  --color-tomato-text-light: #220100;
  --color-tomato-muted-light: #b11e00;
  --color-tomato-accent-light: #ff6347;
  --color-tomato-surface-dark: #220100;
  --color-tomato-border-dark: #670d00;
  --color-tomato-text-dark: #fff2ef;
  --color-tomato-muted-dark: #f95e42;
  --color-tomato-accent-dark: #ff6347;
}
`

test('tomato variables match the explorer Copy variables output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thehextheory-'))
  const out = join(dir, 'src', 'tomato.css')
  execFileSync(process.execPath, [cli, '--color', '#ff6347', '--name', 'Tomato!', '--out', out], {
    encoding: 'utf8',
  })
  assert.equal(readFileSync(out, 'utf8'), tomatoVars)
})

test('the theme flag writes the same tokens inside @theme', () => {
  const text = execFileSync(process.execPath, [cli, '--color', 'tomato', '--name', 'tomato', '--theme'], {
    encoding: 'utf8',
  })
  assert.equal(text, tomatoVars.replace(':root {', '@theme {'))
})
