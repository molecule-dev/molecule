/**
 * Tests for the shipped `base.css` stylesheet (`@molecule/app-ui-tailwind`).
 *
 * `base.css` is the base ClassMap stylesheet every molecule app loads, so
 * shared CSS assets that feature packages reference by name must live here.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const baseCss = readFileSync(fileURLToPath(new URL('../../base.css', import.meta.url)), 'utf8')

describe('base.css shared animations', () => {
  it('defines the `mol-pulse` keyframes referenced by live/recording status dots', () => {
    // Feature packages (e.g. @molecule/app-audio-recorder-react) reference
    // `animation: mol-pulse ...` by name and never redefine the keyframes, so
    // the definition must ship here or the dot renders static.
    expect(baseCss).toContain('@keyframes mol-pulse')
  })

  it('gives `mol-pulse` a real opacity + scale pulse (not an empty stub)', () => {
    const block = baseCss.slice(baseCss.indexOf('@keyframes mol-pulse'))
    expect(block).toMatch(/opacity:\s*0?\.\d+/)
    expect(block).toMatch(/transform:\s*scale\(/)
  })
})
