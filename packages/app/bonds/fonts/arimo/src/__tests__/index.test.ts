import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-arimo', () => {
  it('should export a FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Arimo')
    expect(font.role).toBe('sans')
  })

  it('should have local font source', () => {
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toBeDefined()
    expect(font.source.faces).toHaveLength(3)
  })

  it('should have fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('sans-serif')
  })
})
