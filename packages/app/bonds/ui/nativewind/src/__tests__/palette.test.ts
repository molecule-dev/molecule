/**
 * The web's default palette for a device: Tailwind v4's OKLCH colours as the sRGB colours a browser
 * paints.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { oklchToHex, webPalette } from '../palette.js'

const themeCss = readFileSync(
  createRequire(fileURLToPath(import.meta.resolve('@molecule/app-ui-tailwind'))).resolve(
    'tailwindcss/theme.css',
  ),
  'utf8',
)

describe('oklchToHex', () => {
  it('gives the sRGB colour a browser paints, clipping a colour outside the gamut', () => {
    expect(oklchToHex(0.707, 0.022, 261.325)).toBe('#99a1af')
    expect(oklchToHex(0.637, 0.237, 25.331)).toBe('#fb2c36')
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff')
    expect(oklchToHex(0, 0, 0)).toBe('#000000')
  })
})

describe('webPalette', () => {
  it("reads every shade of v4's theme.css and its plain colours", () => {
    const palette = webPalette(themeCss)
    expect(palette.gray).toMatchObject({ '400': '#99a1af' })
    expect(palette.red).toMatchObject({ '500': '#fb2c36' })
    expect(Object.keys(palette.slate ?? {})).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ])
    expect(palette.black).toBe('#000')
    expect(palette.white).toBe('#fff')
  })
})
