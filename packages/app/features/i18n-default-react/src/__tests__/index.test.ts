import { describe, expect, it } from 'vitest'

import * as neutral from '@molecule/app-i18n-default'

import * as renamed from '../index.js'

describe('@molecule/app-i18n-default-react', () => {
  it('re-exports every export of @molecule/app-i18n-default as the same value', () => {
    expect(Object.keys(renamed).sort()).toEqual(Object.keys(neutral).sort())
    for (const name of Object.keys(neutral)) {
      expect(renamed[name as keyof typeof renamed], name).toBe(
        neutral[name as keyof typeof neutral],
      )
    }
  })
})
