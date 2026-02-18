import { describe, expect, it } from 'vitest'

import type { ComponentIconName } from '@molecule/app-icons'

import { icons, iconSet } from '../index.js'

const REQUIRED_ICONS: ComponentIconName[] = [
  // Status
  'info-circle',
  'check-circle',
  'exclamation-triangle',
  'x-circle',
  // Close/dismiss
  'x-mark',
  // Navigation arrows
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'arrow-down',
  // Chevrons
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevron-down',
  'chevrons-left',
  'chevrons-right',
  // Common actions
  'search',
  'plus',
  'minus',
  'check',
  'pencil',
  'trash',
  'copy',
  'download',
  'upload',
  'share',
  'link',
  'link-external',
  'filter',
  'sort-asc',
  'sort-desc',
  'sync',
  // UI controls
  'ellipsis-horizontal',
  'eye',
  'eye-closed',
  'gear',
  'lock',
  'unlock',
  'home',
  'globe',
  'menu',
  'maximize',
  'minimize',
  // User
  'user',
  'people',
  'sign-in',
  'sign-out',
  // Theme
  'sun',
  'moon',
  // Notifications
  'bell',
  // Content
  'file',
  'folder',
  'calendar',
  'clock',
  'history',
  'tag',
  'star',
  'heart',
  'code',
  'mail',
  // Misc
  'question',
  'bookmark',
  'pin',
  'reply',
  'image',
  'table',
  'thumbsup',
  'thumbsdown',
  // Brand
  'logo-mark',
  'logo-dot',
  'github',
  'google',
  'gitlab',
  'twitter',
]

describe('molecule icon set', () => {
  it('should export icons and iconSet', () => {
    expect(icons).toBeDefined()
    expect(iconSet).toBeDefined()
    expect(iconSet).toBe(icons)
  })

  it('should include all required component icons', () => {
    for (const name of REQUIRED_ICONS) {
      expect(icons[name], `Missing required icon: ${name}`).toBeDefined()
    }
  })

  it('should have at least 71 icons', () => {
    expect(Object.keys(icons).length).toBeGreaterThanOrEqual(71)
  })

  it('should have valid paths or svg for each icon', () => {
    for (const [name, icon] of Object.entries(icons)) {
      const hasPaths = icon.paths.length > 0 && icon.paths.every((p) => p.d)
      const hasSvg = !!icon.svg
      expect(hasPaths || hasSvg, `${name} should have paths or svg`).toBe(true)
    }
  })

  it('should have valid viewBox for each icon', () => {
    for (const [name, icon] of Object.entries(icons)) {
      if (icon.viewBox) {
        expect(icon.viewBox, `${name} viewBox should be a space-separated string`).toMatch(
          /^\d[\d.]* \d[\d.]* [\d.]+ [\d.]+$/,
        )
      }
    }
  })

  it('should have svg field for complex icons', () => {
    expect(icons['logo-mark']!.svg).toBeTruthy()
    expect(icons['gitlab']!.svg).toBeTruthy()
  })

  it('should have brand colors for google icon', () => {
    const google = icons['google']!
    expect(google.paths.length).toBe(4)
    const fills = google.paths.map((p) => p.fill)
    expect(fills).toContain('#4285F4')
    expect(fills).toContain('#34A853')
    expect(fills).toContain('#FBBC05')
    expect(fills).toContain('#EA4335')
  })

  it('should have opacity on logo-dot outer circle', () => {
    const logoDot = icons['logo-dot']!
    expect(logoDot.paths.length).toBe(2)
    expect(logoDot.paths[0]!.opacity).toBe(0.1)
  })

  it('should use kebab-case keys for all icons', () => {
    for (const name of Object.keys(icons)) {
      expect(name, `"${name}" should be kebab-case`).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
    }
  })
})
