/**
 * The colour token table and its resolver: the table is `base.css`'s `@theme`
 * (regenerated and compared), and the resolver computes what the browser
 * computes for it.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { colorTokens } from '../tokens.generated.js'
import { formatColor, mixSrgb, parseColor, resolveColorTokens, themeVariables } from '../tokens.js'

const SCRIPT = fileURLToPath(new URL('../../scripts/build-tokens.mjs', import.meta.url))
const BASE_CSS = readFileSync(fileURLToPath(new URL('../../base.css', import.meta.url)), 'utf8')
const scratch = mkdtempSync(join(tmpdir(), 'mol-tokens-'))

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

/**
 * Runs the generator's `--check` against a stylesheet.
 *
 * @param css - The stylesheet to check the committed table against (default: `base.css`).
 * @returns Its exit status and stderr.
 */
function check(css?: string): { status: number | null; stderr: string } {
  const args = [SCRIPT, '--check']
  if (css !== undefined) {
    const file = join(scratch, `base-${Math.random().toString(36).slice(2)}.css`)
    writeFileSync(file, css)
    args.push('--base', file)
  }
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' })
  return { status: result.status, stderr: result.stderr }
}

describe('colorTokens', () => {
  it('is the table base.css generates (npm run gen:tokens)', () => {
    const result = check()
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('is reported stale when base.css changes without regenerating it', () => {
    const edited = BASE_CSS.replace(
      '--color-primary: var(--mol-color-primary, #4070e0);',
      '--color-primary: var(--mol-color-primary, #4070e1);',
    )
    expect(edited).not.toBe(BASE_CSS)
    const result = check(edited)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('npm run gen:tokens')
  })

  it('refuses a value form it cannot resolve, instead of dropping the token', () => {
    const edited = BASE_CSS.replace('@theme {', '@theme {\n  --color-odd: oklch(70% 0.1 200);')
    const result = check(edited)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('--color-odd')
  })

  it('covers every colour token of the @theme block', () => {
    const theme = BASE_CSS.slice(
      BASE_CSS.indexOf('@theme {'),
      BASE_CSS.indexOf('\n}', BASE_CSS.indexOf('@theme {')),
    )
    const declared = [...theme.matchAll(/--color-([\w-]+):/g)].map((m) => m[1])
    expect(colorTokens.map((t) => t.name)).toEqual(declared)
  })
})

describe('parseColor', () => {
  it('reads hex, rgb(), hsl() and keywords', () => {
    expect(parseColor('#4070e0')).toEqual([64, 112, 224, 1])
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1])
    expect(parseColor('#00000080')).toEqual([0, 0, 0, 128 / 255])
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual([0, 0, 0, 0.5])
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual([10, 20, 30, 0.5])
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual([255, 0, 0, 1])
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0])
    expect(parseColor(' White ')).toEqual([255, 255, 255, 1])
  })

  it('throws on a colour it cannot read rather than painting black', () => {
    expect(() => parseColor('oklch(70% 0.1 200)')).toThrow('oklch')
    expect(() => parseColor('rebeccapurple')).toThrow()
    expect(() => parseColor('rgb(1, 2)')).toThrow()
  })
})

describe('resolveColorTokens', () => {
  it('starts every core token on base.css default', () => {
    const tokens = resolveColorTokens()
    expect(tokens.size).toBe(colorTokens.length)
    expect(tokens.get('primary')).toEqual([64, 112, 224, 1])
    expect(tokens.get('foreground')).toEqual([51, 51, 51, 1])
    expect(tokens.get('overlay')).toEqual([0, 0, 0, 0.5])
  })

  it('derives the mixed and aliased tokens from the palette it is given', () => {
    const tokens = resolveColorTokens({ primary: '#000000', surface: '#ffffff', text: '#ffffff' })
    // --color-primary-container: color-mix(in srgb, var(--color-primary) 30%, var(--color-surface))
    expect(tokens.get('primary-container')?.map(Math.round)).toEqual([179, 179, 179, 1])
    // --color-on-surface: var(--color-foreground)
    expect(tokens.get('on-surface')).toEqual([255, 255, 255, 1])
    // --color-on-primary: var(--color-foreground-inverse, #ffffff)
    expect(tokens.get('on-primary')).toEqual([255, 255, 255, 1])
  })

  it('mixes premultiplied, as color-mix(in srgb) does with a translucent operand', () => {
    expect(mixSrgb([255, 0, 0, 1], 50, [0, 0, 255, 0])).toEqual([255, 0, 0, 0.5])
    expect(mixSrgb([0, 0, 0, 0], 50, [0, 0, 0, 0])).toEqual([0, 0, 0, 0])
  })

  it('reports a token that refers to itself or to nothing', () => {
    expect(() => resolveColorTokens({}, [{ name: 'a', kind: 'alias', ref: 'a' }])).toThrow(
      'refers to itself',
    )
    expect(() => resolveColorTokens({}, [{ name: 'a', kind: 'alias', ref: 'missing' }])).toThrow(
      '--color-missing',
    )
  })
})

describe('themeVariables', () => {
  it('gives each token its colour and its channels', () => {
    const variables = themeVariables()
    expect(Object.keys(variables)).toHaveLength(colorTokens.length * 2)
    expect(variables['--color-background']).toBe('rgb(246, 246, 246)')
    expect(variables['--color-background-rgb']).toBe('246 246 246')
    expect(variables['--color-overlay']).toBe('rgba(0, 0, 0, 0.5)')
    expect(variables['--color-overlay-rgb']).toBe('0 0 0')
  })

  it('follows a custom palette', () => {
    expect(themeVariables({ primary: '#aa286b' })['--color-primary']).toBe('rgb(170, 40, 107)')
  })

  it('formats a colour the way the variables carry it', () => {
    expect(formatColor([1.4, 300, -2, 1])).toBe('rgb(1, 255, 0)')
    expect(formatColor([0, 0, 0, 0.12345])).toBe('rgba(0, 0, 0, 0.123)')
  })
})
