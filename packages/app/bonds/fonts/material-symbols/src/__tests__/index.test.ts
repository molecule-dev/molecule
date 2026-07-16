import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-material-symbols', () => {
  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Material Symbols Outlined')
    expect(font.role).toBe('icon')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(1)
  })

  it('should never load from an external CDN', () => {
    expect(font.source.url).toBeUndefined()
    for (const face of font.source.faces ?? []) {
      expect(face.file).not.toMatch(/^https?:/)
    }
  })

  it('should carry the icon utility class', () => {
    expect(font.utilityCss).toContain('.material-symbols-outlined {')
  })
})
