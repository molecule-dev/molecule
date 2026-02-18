import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-system', () => {
  it('should export a FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('system-ui')
    expect(font.role).toBe('sans')
  })

  it('should have system source type', () => {
    expect(font.source.type).toBe('system')
    expect(font.source.url).toBeUndefined()
    expect(font.source.preconnect).toBeUndefined()
  })

  it('should have fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('sans-serif')
  })
})
