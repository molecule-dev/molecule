import { readFileSync } from 'node:fs'

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
    expect(font.source.faces).toHaveLength(6)
  })

  it('should have monospace fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('monospace')
  })

  it('serves actual webfont bytes at the regular and bold asset URLs', () => {
    const staticFaces = font.source.faces?.filter((face) => !face.variable) ?? []
    expect(new Set(staticFaces.map((face) => face.weight))).toEqual(new Set([400, 700]))
    for (const face of staticFaces) {
      const bytes = readFileSync(new URL(face.file))
      expect(bytes.subarray(0, 4).toString('ascii'), face.file).toBe('wOF2')
    }
  })

  it('should ship the font license with the font files', () => {
    const license = readFileSync(new URL('../../fonts/OFL.txt', import.meta.url), 'utf8')
    expect(license).toMatch(/SIL Open Font License/i)
    expect(license).toMatch(/Copyright/)
  })
})
