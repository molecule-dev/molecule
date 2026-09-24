/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the REAL NativeWind ClassMap bonded
 * into the REAL `@molecule/app-ui` core and resolved by the component helper.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'

import { classMap } from '../index.js'

/**
 * The example's style helper, verbatim.
 *
 * @returns The resolved NativeWind class strings.
 */
function photoGridStyles(): { grid: string; tile: string; title: string; link: string } {
  const cm = getClassMap()
  return {
    grid: cm.grid({ cols: 2, gap: 'md' }),
    tile: cm.card(),
    title: cm.cardTitle,
    link: cm.link,
  }
}

describe('README @example', () => {
  it('bonds the NativeWind ClassMap and resolves RN-safe tokens', () => {
    setClassMap(classMap)

    const styles = photoGridStyles()

    expect(styles.grid).toBe('flex flex-row flex-wrap gap-4')
    expect(styles.grid.split(' ')).not.toContain('grid')
    expect(styles.tile.split(' ')).toEqual(expect.arrayContaining(['rounded-lg', 'bg-surface']))
    expect(styles.title).toContain('font-semibold')
    expect(styles.link).toBe('active:opacity-70')
    expect(styles.link).not.toContain('hover:')
  })
})
