import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FontDefinition } from '../index.js'
import {
  buildFontFamily,
  getFont,
  getFontConfig,
  hasFont,
  hasFontConfig,
  resetFonts,
  setFont,
  systemMono,
  systemSans,
  systemSerif,
} from '../index.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const arimoFont: FontDefinition = {
  family: 'Arimo',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400..700;1,400..700&display=swap',
    preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  },
}

const jetbrainsFont: FontDefinition = {
  family: 'JetBrains Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'monospace'],
  source: {
    type: 'google',
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap',
    preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  },
}

const localFont: FontDefinition = {
  family: 'Arimo',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      { file: 'Arimo-Regular.ttf', weight: 400 },
      { file: 'Arimo-Bold.ttf', weight: 700 },
      { file: 'Arimo-VariableFont_wght.ttf', weight: '100 1000', variable: true },
    ],
  },
}

const systemFont: FontDefinition = {
  family: 'system-ui',
  role: 'sans',
  fallbacks: ['-apple-system', 'sans-serif'],
  source: { type: 'system' },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-fonts', () => {
  beforeEach(() => {
    resetFonts()
  })

  // -------------------------------------------------------------------------
  // buildFontFamily
  // -------------------------------------------------------------------------

  describe('buildFontFamily', () => {
    it('should build a CSS font-family string for a simple name', () => {
      expect(buildFontFamily(arimoFont)).toBe('Arimo, system-ui, -apple-system, sans-serif')
    })

    it('should quote font names with spaces', () => {
      expect(buildFontFamily(jetbrainsFont)).toBe(
        "'JetBrains Mono', SFMono-Regular, Menlo, monospace",
      )
    })

    it('should handle system fonts', () => {
      expect(buildFontFamily(systemSans)).toBe(
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      )
    })

    it('should handle serif system fonts', () => {
      expect(buildFontFamily(systemSerif)).toBe('Georgia, "Times New Roman", Times, serif')
    })

    it('should handle monospace system fonts', () => {
      expect(buildFontFamily(systemMono)).toContain('SFMono-Regular')
      expect(buildFontFamily(systemMono)).toContain('monospace')
    })
  })

  // -------------------------------------------------------------------------
  // System font defaults
  // -------------------------------------------------------------------------

  describe('system font defaults', () => {
    it('should define sans-serif system font', () => {
      expect(systemSans.family).toBe('system-ui')
      expect(systemSans.role).toBe('sans')
      expect(systemSans.source.type).toBe('system')
    })

    it('should define serif system font', () => {
      expect(systemSerif.family).toBe('Georgia')
      expect(systemSerif.role).toBe('serif')
      expect(systemSerif.source.type).toBe('system')
    })

    it('should define monospace system font', () => {
      expect(systemMono.family).toBe('SFMono-Regular')
      expect(systemMono.role).toBe('mono')
      expect(systemMono.source.type).toBe('system')
    })
  })

  // -------------------------------------------------------------------------
  // Provider: setFont / getFont / hasFont
  // -------------------------------------------------------------------------

  describe('setFont / getFont / hasFont', () => {
    it('should return undefined for unset role', () => {
      expect(getFont('sans')).toBeUndefined()
      expect(hasFont('sans')).toBe(false)
    })

    it('should set and get a font by role', () => {
      setFont(arimoFont)
      expect(getFont('sans')).toBe(arimoFont)
      expect(hasFont('sans')).toBe(true)
    })

    it('should set fonts for different roles independently', () => {
      setFont(arimoFont)
      setFont(jetbrainsFont)
      expect(getFont('sans')).toBe(arimoFont)
      expect(getFont('mono')).toBe(jetbrainsFont)
      expect(getFont('serif')).toBeUndefined()
    })

    it('should overwrite a font for the same role', () => {
      setFont(arimoFont)
      setFont(systemFont) // also role: 'sans'
      expect(getFont('sans')).toBe(systemFont)
    })
  })

  // -------------------------------------------------------------------------
  // Provider: getFontConfig / hasFontConfig
  // -------------------------------------------------------------------------

  describe('getFontConfig / hasFontConfig', () => {
    it('should return false when no fonts configured', () => {
      expect(hasFontConfig()).toBe(false)
    })

    it('should return true when any font is configured', () => {
      setFont(jetbrainsFont)
      expect(hasFontConfig()).toBe(true)
    })

    it('should fall back to system fonts for unset roles', () => {
      setFont(arimoFont)
      const config = getFontConfig()
      expect(config.sans).toBe(arimoFont)
      expect(config.serif).toBe(systemSerif)
      expect(config.mono).toBe(systemMono)
    })

    it('should return all configured fonts', () => {
      setFont(arimoFont)
      setFont(jetbrainsFont)
      const config = getFontConfig()
      expect(config.sans).toBe(arimoFont)
      expect(config.mono).toBe(jetbrainsFont)
      expect(config.serif).toBe(systemSerif)
    })
  })

  // -------------------------------------------------------------------------
  // Provider: resetFonts
  // -------------------------------------------------------------------------

  describe('resetFonts', () => {
    it('should clear all configured fonts', () => {
      setFont(arimoFont)
      setFont(jetbrainsFont)
      resetFonts()
      expect(hasFontConfig()).toBe(false)
      expect(getFont('sans')).toBeUndefined()
      expect(getFont('mono')).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // CSS variable application
  // -------------------------------------------------------------------------

  describe('CSS variable application', () => {
    let mockSetProperty: ReturnType<typeof vi.fn>
    let mockAppendChild: ReturnType<typeof vi.fn>
    let mockQuerySelector: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockSetProperty = vi.fn()
      mockAppendChild = vi.fn()
      mockQuerySelector = vi.fn().mockReturnValue(null)

      vi.stubGlobal('document', {
        documentElement: {
          style: { setProperty: mockSetProperty },
        },
        head: { appendChild: mockAppendChild },
        querySelector: mockQuerySelector,
        getElementById: vi.fn().mockReturnValue(null),
        createElement: vi.fn().mockImplementation((tag: string) => {
          const el: Record<string, unknown> = { tagName: tag }
          return el
        }),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should set CSS variable when setting a font', () => {
      setFont(arimoFont)
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mol-font-sans',
        'Arimo, system-ui, -apple-system, sans-serif',
      )
    })

    it('should set CSS variable for mono role', () => {
      setFont(jetbrainsFont)
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mol-font-mono',
        "'JetBrains Mono', SFMono-Regular, Menlo, monospace",
      )
    })

    it('should inject preconnect and stylesheet links for web fonts', () => {
      setFont(arimoFont)
      // preconnect (2) + stylesheet (1) = 3 appended elements
      expect(mockAppendChild).toHaveBeenCalledTimes(3)
    })

    it('should not inject links for system fonts', () => {
      setFont(systemFont)
      expect(mockSetProperty).toHaveBeenCalled()
      // Only the CSS variable, no link injection
      expect(mockAppendChild).not.toHaveBeenCalled()
    })

    it('should inject @font-face style element for local fonts', () => {
      setFont(localFont)
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mol-font-sans',
        'Arimo, system-ui, -apple-system, sans-serif',
      )
      // Local fonts inject a <style> element with @font-face declarations
      expect(mockAppendChild).toHaveBeenCalledTimes(1)
      const styleEl = mockAppendChild.mock.calls[0][0]
      expect(styleEl.tagName).toBe('style')
      expect(styleEl.id).toBe('mol-font-sans')
      expect(styleEl.textContent).toContain("font-family: 'Arimo'")
      expect(styleEl.textContent).toContain('Arimo-Regular.ttf')
      expect(styleEl.textContent).toContain('Arimo-Bold.ttf')
    })

    it('should not inject duplicate stylesheet links', () => {
      mockQuerySelector.mockReturnValue({ href: arimoFont.source.url })
      setFont(arimoFont)
      // CSS variable is set, but no links appended
      expect(mockSetProperty).toHaveBeenCalled()
      expect(mockAppendChild).not.toHaveBeenCalled()
    })
  })
})
