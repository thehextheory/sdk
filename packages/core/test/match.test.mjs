import assert from 'node:assert/strict'
import test from 'node:test'
import { deltaE2000, nearestCssColor, nearestTailwindStep, parseColor } from '@thehextheory/core'

test('CIEDE2000 matches the Sharma reference pair', () => {
  const distance = deltaE2000(
    { l: 50, a: 2.6772, b: -79.7751 },
    { l: 50, a: 0, b: -82.7485 },
  )
  assert.ok(Math.abs(distance - 2.0425) < 0.001, String(distance))
})

test('an identical Lab color has no difference', () => {
  const lab = { l: 50, a: 10, b: -20 }
  assert.equal(deltaE2000(lab, lab), 0)
})

test('tomato is an exact CSS name and the nearest Tailwind step is red-500', () => {
  const tomato = parseColor('tomato')
  assert.ok(tomato)
  const css = nearestCssColor(tomato)
  assert.equal(css.name, 'tomato')
  assert.ok(css.deltaE < 0.05)
  const step = nearestTailwindStep(tomato)
  assert.equal(step.name, 'red-500')
  assert.ok(step.deltaE > 0)
})

test('a one-off hex still matches tomato and red-500', () => {
  const rgb = parseColor('#ff6348')
  assert.ok(rgb)
  assert.equal(nearestCssColor(rgb).name, 'tomato')
  assert.equal(nearestTailwindStep(rgb).name, 'red-500')
})

test('an exact Tailwind hex matches that step', () => {
  const red = parseColor('#ef4444')
  assert.ok(red)
  const step = nearestTailwindStep(red)
  assert.equal(step.name, 'red-500')
  assert.ok(step.deltaE < 0.05)
})
