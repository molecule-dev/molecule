import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-source-serif-4', () => {
  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Source Serif 4')
    expect(font.role).toBe('serif')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(2)
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

  it('ships Adobe’s reserved-name notice with its original TrueType faces', () => {
    const notice = new URL('../../fonts/OFL-Adobe.txt', import.meta.url)
    expect(existsSync(notice)).toBe(true)
    expect(readFileSync(notice, 'utf8')).toContain("with Reserved Font Name 'Source'")
    for (const face of font.source.faces ?? []) {
      expect(face.file).toMatch(/\.ttf$/)
      expect(face.unicodeRange).toBeUndefined()
    }
  })
})
