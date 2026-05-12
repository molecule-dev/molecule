import { describe, expect, it } from 'vitest'

import { PROVIDER_BRAND_COLORS } from '../colors.js'
import type { AIProviderID } from '../types.js'

const ALL_PROVIDERS: readonly AIProviderID[] = [
  'anthropic',
  'openai',
  'google',
  'xai',
  'meta',
  'moonshot',
  'minimax',
  'alibaba',
  'zhipu',
]

describe('PROVIDER_BRAND_COLORS', () => {
  it('has a hex color for every AIProviderID', () => {
    for (const id of ALL_PROVIDERS) {
      expect(PROVIDER_BRAND_COLORS[id]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('uses distinct colors per provider', () => {
    const values = Object.values(PROVIDER_BRAND_COLORS)
    expect(new Set(values).size).toBe(values.length)
  })
})
