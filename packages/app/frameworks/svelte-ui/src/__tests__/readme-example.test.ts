/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the REAL Tailwind ClassMap — and
 * that the ordering it warns about is real: importing this package before a
 * ClassMap is bonded throws.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

describe('README @example', () => {
  // Order matters: this file has not bonded a ClassMap yet when the first test runs.
  it('throws at IMPORT time when no ClassMap is bonded yet', async () => {
    await expect(import('../index.js')).rejects.toThrow(/No UIClassMap has been set/)
  })

  it('resolves class strings through the bonded ClassMap', async () => {
    // Fresh module graph: the failed import above is cached otherwise.
    vi.resetModules()
    const { setClassMap } = await import('@molecule/app-ui')
    const { classMap } = await import('@molecule/app-ui-tailwind')

    setClassMap(classMap)
    const { getButtonClasses, getCardClasses, getInputClasses } = await import('../index.js')

    const cardClass = getCardClasses({ variant: 'outlined', padding: 'lg' })
    const saveButtonClass = getButtonClasses({ color: 'primary', fullWidth: true })
    const nameInputClass = (error?: string): string => getInputClasses({ size: 'md', error })

    expect(cardClass).toContain(classMap.card({ variant: 'outline' }))
    expect(cardClass).toContain(classMap.cardPadding('lg'))
    expect(saveButtonClass).toBe(
      classMap.cn(
        classMap.button({ variant: 'solid', color: 'primary', size: 'md', fullWidth: true }),
      ),
    )
    expect(nameInputClass()).not.toBe(nameInputClass('Name is required'))
  })
})
