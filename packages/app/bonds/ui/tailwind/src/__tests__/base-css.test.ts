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

import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const baseCss = readFileSync(fileURLToPath(new URL('../../base.css', import.meta.url)), 'utf8')

/**
 * Compiles `base.css` (plus any app CSS loaded after it) the way an app's
 * Tailwind build does, and returns the CSS generated for one `dark:` utility.
 *
 * @param appCss - CSS an app loads after `base.css`.
 * @returns The generated rule for `dark:underline`.
 */
const darkRule = async (appCss = ''): Promise<string> => {
  const compiler = await compile(`${baseCss}\n${appCss}\n@tailwind utilities;`, {
    loadStylesheet: async (id: string) => {
      throw new Error(`base.css must not import stylesheets (asked for ${id})`)
    },
  })
  const out = compiler.build(['dark:underline'])
  return out.slice(out.indexOf('.dark\\:underline'))
}

describe('base.css dark variant', () => {
  it('ties `dark:` utilities to the theme bond mode, not the browser preference', async () => {
    const rule = await darkRule()
    expect(rule).toContain(`[data-mol-mode='dark']`)
    expect(rule).not.toContain('prefers-color-scheme')
  })

  it('lets an app that still defines its own `dark` variant keep it', async () => {
    const rule = await darkRule('@custom-variant dark (&:where(.dark, .dark *));')
    expect(rule).toContain('.dark *')
    expect(rule).not.toContain('data-mol-mode')
  })
})

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
