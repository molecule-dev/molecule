import { describe, expectTypeOf, it } from 'vitest'

import type { useTranslation } from '../useTranslation.js'

declare const t: ReturnType<typeof useTranslation>['t']

describe('useTranslation without app catalogs', () => {
  it('keeps the string-key signatures for existing apps', () => {
    const links = [
      { key: 'terms', label: 'Terms' },
      { key: 'privacy', label: 'Privacy' },
    ] as const
    const labels = links.map(({ key, label }) => t(`footer.${key}`, {}, { defaultValue: label }))
    expectTypeOf(labels).toEqualTypeOf<string[]>()
  })
})
