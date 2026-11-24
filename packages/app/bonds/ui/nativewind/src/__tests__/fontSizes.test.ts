import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import { WEB_FONT_SIZES } from '../fontSizes.js'

/**
 * The font sizes Tailwind 4's theme declares (`--text-sm: 0.875rem` and
 * `--text-sm--line-height: calc(1.25 / 0.875)`), read from the Tailwind the web ClassMap uses.
 *
 * @returns Each size's value and line height, evaluated.
 */
function webTheme(): Record<string, { size: string; lineHeight: number }> {
  const web = createRequire(import.meta.resolve('@molecule/app-ui-tailwind'))
  const css = readFileSync(web.resolve('tailwindcss/theme.css'), 'utf8')
  const out: Record<string, { size: string; lineHeight: number }> = {}
  for (const [, name, size] of css.matchAll(/--text-([a-z0-9]+):\s*([^;]+);/g)) {
    const lineHeight = new RegExp(`--text-${name}--line-height:\\s*([^;]+);`).exec(css)?.[1] ?? ''
    const ratio = /^calc\(([\d.]+) \/ ([\d.]+)\)$/.exec(lineHeight)
    out[name] = {
      size,
      lineHeight: ratio ? Number(ratio[1]) / Number(ratio[2]) : Number(lineHeight),
    }
  }
  return out
}

describe('WEB_FONT_SIZES', () => {
  it("is Tailwind 4's font-size scale, line heights included", () => {
    const theme = webTheme()
    expect(Object.keys(theme).length).toBeGreaterThan(10)
    expect(Object.keys(WEB_FONT_SIZES)).toEqual(Object.keys(theme))
    for (const [name, { size, lineHeight }] of Object.entries(WEB_FONT_SIZES)) {
      expect({ name, size, lineHeight: Number(lineHeight) }).toEqual({ name, ...theme[name] })
    }
  })
})
