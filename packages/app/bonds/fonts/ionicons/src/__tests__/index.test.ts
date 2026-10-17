import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetFonts, setFont } from '@molecule/app-fonts'
// The exact import form the package README documents: a bundler asset URL.
// It resolves only because package.json exports `./fonts/*`.
import woffUrl from '@molecule/app-fonts-ionicons/fonts/ionicons.woff?url'

import { font } from '../index.js'
import { ioniconsUtilityCss } from '../utility-css.js'

describe('@molecule/app-fonts-ionicons', () => {
  it('should export a local FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Ionicons')
    expect(font.role).toBe('icon')
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toHaveLength(1)
    expect(font.source.faces?.[0]?.file).toBe('ionicons.woff')
  })

  it('should never load from an external CDN', () => {
    expect(font.source.url).toBeUndefined()
    for (const face of font.source.faces ?? []) {
      expect(face.file).not.toMatch(/^https?:/)
    }
  })

  it('should carry the .ion base rule and the full glyph map as utility CSS', () => {
    expect(font.utilityCss).toBeDefined()
    expect(font.utilityCss).toContain('.ion, .ionicons,')
    expect(font.utilityCss).toContain('font-family: "Ionicons"')
  })

  it('should cover the glyph classes the RealWorld Conduit markup uses', () => {
    // Without these rules the spec's <i class="ion-*"> elements render 0×0.
    for (const glyph of [
      'ion-heart',
      'ion-plus-round',
      'ion-edit',
      'ion-trash-a',
      'ion-gear-a',
      'ion-compose',
    ]) {
      expect(font.utilityCss).toContain(`.${glyph}:before {`)
    }
  })

  it('should match the exported CSS constant byte-for-byte', () => {
    expect(font.utilityCss).toBe(ioniconsUtilityCss)
  })

  it('should not carry CSS that breaks out of a <style> element', () => {
    // The same refusal mlcl's assertSafeFontMeta applies to registry metadata.
    expect(font.utilityCss).not.toContain('</style')
    expect(font.utilityCss).not.toContain('@font-face')
  })
})

describe('wiring it without mlcl (the documented asset import)', () => {
  afterEach(() => {
    resetFonts()
    vi.unstubAllGlobals()
  })

  it('uses the imported webfont URL as the face, not <basePath>fonts/<file>', () => {
    const appended: Record<string, unknown>[] = []
    vi.stubGlobal('document', {
      documentElement: { style: { setProperty: vi.fn() } },
      head: { appendChild: (el: Record<string, unknown>) => appended.push(el) },
      querySelector: vi.fn().mockReturnValue(null),
      getElementById: vi.fn().mockReturnValue(null),
      createElement: vi.fn().mockImplementation(() => ({ tagName: 'style' })),
    })

    setFont(
      { ...font, source: { type: 'local', faces: [{ file: woffUrl, weight: 400 }] } },
      { basePath: '/blog/' },
    )

    expect(typeof woffUrl).toBe('string')
    const styleEl = appended[0]
    expect(styleEl.textContent).toContain(`src: url('${woffUrl}')`)
    expect(styleEl.textContent).not.toContain('/blog/fonts/')
  })
})
