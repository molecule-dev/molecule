import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-jetbrains-mono', () => {
  it('should export a FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('JetBrains Mono')
    expect(font.role).toBe('mono')
  })

  it('should have local font source', () => {
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toBeDefined()
    expect(font.source.faces).toHaveLength(3)
  })

  it('should have monospace fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('monospace')
  })
})
