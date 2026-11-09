import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-space-mono', () => {
  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Space Mono')
    expect(font.role).toBe('mono')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(3)
  })

  it('should never load from an external CDN', () => {
    expect(font.source.url).toBeUndefined()
    for (const face of font.source.faces ?? []) {
      expect(face.file).not.toMatch(/^https?:/)
    }
  })

  it('should ship the font license with the font files', () => {
    const license = readFileSync(new URL('../../fonts/OFL.txt', import.meta.url), 'utf8')
    expect(license).toMatch(/SIL Open Font License/i)
    expect(license).toMatch(/Copyright/)
  })
})
