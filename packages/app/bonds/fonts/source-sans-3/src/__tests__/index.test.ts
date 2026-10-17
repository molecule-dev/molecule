import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { getFont, resetFonts, setFont } from '@molecule/app-fonts'

import { font } from '../index.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('@molecule/app-fonts-source-sans-3', () => {
  afterEach(() => {
    resetFonts()
  })

  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Source Sans Pro')
    expect(font.role).toBe('sans')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(1)
  })

  it("should register the 'Source Sans Pro' family the shipped stylesheets ask for", () => {
    setFont(font)
    expect(getFont('sans')?.family).toBe('Source Sans Pro')
  })

  it('should never load from an external CDN', () => {
    expect(font.source.url).toBeUndefined()
    for (const face of font.source.faces ?? []) {
      expect(face.file).not.toMatch(/^https?:/)
    }
  })

  it('should ship the font file its faces declare', () => {
    for (const face of font.source.faces ?? []) {
      expect(existsSync(join(packageDir, 'fonts', face.file))).toBe(true)
    }
  })
})
