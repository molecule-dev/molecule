// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the real molecule icon set.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { iconSet } from '@molecule/app-icons-molecule'

import { getIcon, getIconDataUrl, hasIconSet, setIconSet } from '../index.js'

describe('README @example', () => {
  it('bonds the icon set and resolves glyph data and a CSS data URL', () => {
    setIconSet(iconSet)
    expect(hasIconSet()).toBe(true)

    const check = getIcon('check-circle')
    expect(check.viewBox).toBe('0 0 16 16')
    expect(check.paths).toHaveLength(1)

    const successIcon = getIconDataUrl('check-circle', '#16a34a')
    expect(successIcon.startsWith('url("data:image/svg+xml,')).toBe(true)
    expect(successIcon).toContain("fill='%2316a34a'")

    document.documentElement.style.setProperty('--icon-success', successIcon)
    expect(document.documentElement.style.getPropertyValue('--icon-success')).toContain(
      'data:image/svg+xml',
    )
  })
})
