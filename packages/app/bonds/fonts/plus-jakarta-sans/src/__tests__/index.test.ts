import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-plus-jakarta-sans', () => {
  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Plus Jakarta Sans')
    expect(font.role).toBe('sans')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(1)
  })

  it('should never load from an external CDN', () => {
    expect(font.source.url).toBeUndefined()
    for (const face of font.source.faces ?? []) {
      expect(face.file).not.toMatch(/^https?:/)
    }
  })
})
