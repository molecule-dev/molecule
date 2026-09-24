// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the real Arimo and JetBrains Mono
 * font bonds in a DOM.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { font as sans } from '@molecule/app-fonts-arimo'
import { font as mono } from '@molecule/app-fonts-jetbrains-mono'

import { getFontConfig, setFont } from '../index.js'

describe('README @example', () => {
  it('sets the CSS variables and injects local @font-face rules per role', () => {
    setFont(sans, { basePath: import.meta.env.BASE_URL })
    setFont(mono, { basePath: import.meta.env.BASE_URL })

    const root = document.documentElement.style
    expect(root.getPropertyValue('--mol-font-sans')).toBe(
      'Arimo, system-ui, -apple-system, sans-serif',
    )
    expect(root.getPropertyValue('--mol-font-mono')).toBe(
      "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    )

    const sansCss = document.getElementById('mol-font-sans')?.textContent ?? ''
    expect(sansCss).toContain("src: url('/fonts/Arimo-Regular.ttf')")
    expect(document.getElementById('mol-font-mono')?.textContent).toContain(
      "src: url('/fonts/JetBrainsMono-Regular.ttf')",
    )
    // No CDN link is ever injected for local fonts.
    expect(document.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(0)

    const config = getFontConfig()
    expect(config.sans.family).toBe('Arimo')
    expect(config.mono.family).toBe('JetBrains Mono')
    expect(config.serif.family).toBe('Georgia')
  })
})
