// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real Tailwind merger, the real
 * Tailwind ClassMap and the real light theme. `@molecule/app-styling` is
 * aliased to this package's source so the bond registers its merger on the
 * same module instance the test exercises.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-styling', () => import('../index.js'))

import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'
import { lightTheme } from '@molecule/app-theme'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { cva, setClassMerger, themeToCSS } from '../index.js'

describe('README @example', () => {
  it('writes theme variables to :root and resolves variant conflicts through the merger', () => {
    setClassMap(classMap)
    registerTailwindClassMerger()

    for (const [name, value] of Object.entries(themeToCSS(lightTheme))) {
      document.documentElement.style.setProperty(name, value)
    }
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      lightTheme.colors.primary,
    )

    const cm = getClassMap()
    const statusText = cva(cm.textSize('sm'), {
      variants: { tone: { ok: cm.textSuccess, failing: cm.textError, idle: cm.textMuted } },
      defaultVariants: { tone: 'idle' },
    })

    const className = statusText({ tone: 'failing', class: cm.textSize('lg') })
    const tokens = className.split(' ')
    expect(tokens).toContain(cm.textError)
    expect(tokens).toContain(cm.textSize('lg'))
    expect(tokens).not.toContain(cm.textSize('sm'))

    expect(statusText().split(' ')).toEqual([cm.textSize('sm'), cm.textMuted])

    // Without a merger both sizes survive — the gotcha the remarks warn about.
    setClassMerger(null)
    expect(statusText({ tone: 'failing', class: cm.textSize('lg') }).split(' ')).toContain(
      cm.textSize('sm'),
    )
  })
})
