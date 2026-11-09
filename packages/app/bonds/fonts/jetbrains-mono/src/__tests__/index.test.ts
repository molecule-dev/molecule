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
    expect(font.source.faces).toHaveLength(3)
  })

  it('should have monospace fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('monospace')
  })

  it('should ship the font license with the font files', () => {
    const license = readFileSync(new URL('../../fonts/OFL.txt', import.meta.url), 'utf8')
    expect(license).toMatch(/SIL Open Font License/i)
    expect(license).toMatch(/Copyright/)
  })
})
