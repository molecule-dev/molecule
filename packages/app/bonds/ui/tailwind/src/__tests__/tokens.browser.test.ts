/**
 * `resolveColorTokens` against the browser: Chromium evaluates `base.css`'s own
 * `@theme` declarations (verbatim, `color-mix()` included) and every token must
 * come out as the same 8-bit colour the resolver computes. A new value form in
 * `base.css` that the resolver gets wrong fails here.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { type Browser, chromium } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { colorTokens } from '../tokens.generated.js'
import { resolveColorTokens, type ThemeColorInput } from '../tokens.js'

const css = readFileSync(fileURLToPath(new URL('../../base.css', import.meta.url)), 'utf8')
const start = css.indexOf('@theme {')
const themeBlock = css.slice(start + '@theme {'.length, css.indexOf('\n}', start))

/** Palettes to compare: base.css defaults, a dark palette, and a brand with a translucent surface. */
const PALETTES: Record<string, ThemeColorInput> = {
  defaults: {},
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceSecondary: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textInverse: '#0f172a',
    primary: '#60a5fa',
    secondary: '#a78bfa',
    border: '#334155',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#22d3ee',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  brand: { primary: '#aa286b', surface: 'rgba(255, 248, 240, 0.9)', text: 'hsl(220, 30%, 20%)' },
}

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser?.close()
})

/**
 * Reads a computed colour (`rgb()`, `rgba()` or `color(srgb …)`).
 *
 * @param text - The computed value.
 * @returns The colour as 0–255 channels and alpha.
 */
function readComputed(text: string): [number, number, number, number] {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(text)
  if (srgb)
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
      srgb[4] === undefined ? 1 : Number(srgb[4]),
    ]
  const rgb = /^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)$/.exec(text)
  if (!rgb) throw new Error(`unreadable computed colour ${text}`)
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
}

/**
 * The `--mol-color-*` declarations the web theme bond writes for a palette.
 *
 * @param palette - The palette.
 * @returns The declarations.
 */
function molDeclarations(palette: ThemeColorInput): string {
  return Object.entries(palette)
    .map(
      ([key, value]) =>
        `--mol-color-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`,
    )
    .join('\n')
}

describe('resolveColorTokens matches Chromium on base.css', () => {
  for (const [name, palette] of Object.entries(PALETTES)) {
    it(`computes every token of the ${name} palette as the browser does`, async () => {
      const page = await browser.newPage()
      try {
        await page.setContent(
          `<style>:root{${molDeclarations(palette)}\n${themeBlock}}</style><div id="probe"></div>`,
        )
        const computed = await page.evaluate(
          (names) => {
            const probe = document.getElementById('probe') as HTMLElement
            return names.map((token) => {
              probe.style.backgroundColor = `var(--color-${token})`
              return getComputedStyle(probe).backgroundColor
            })
          },
          colorTokens.map((t) => t.name),
        )
        const mine = resolveColorTokens(palette)
        const mismatches = colorTokens.flatMap((token, i) => {
          const browserColor = readComputed(computed[i])
          const jsColor = mine.get(token.name) as readonly number[]
          const channel = Math.max(...[0, 1, 2].map((c) => Math.abs(browserColor[c] - jsColor[c])))
          const alpha = Math.abs(browserColor[3] - jsColor[3])
          // The same 8-bit pixel: unrounded channels within half a step.
          return channel > 0.51 || alpha > 0.002
            ? [`${token.name}: browser ${computed[i]}, resolver ${jsColor.join(' ')}`]
            : []
        })
        expect(mismatches).toEqual([])
      } finally {
        await page.close()
      }
    })
  }
})
