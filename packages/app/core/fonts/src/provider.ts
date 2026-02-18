/**
 * Font bond accessor and DOM injection logic.
 *
 * Font bond packages (e.g. `@molecule/app-fonts-arimo`) export a
 * `FontDefinition`, which is passed to `setFont()` to register the font
 * and inject the necessary CSS into the document head.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, unbondAll } from '@molecule/app-bond'

import type { FontConfig, FontDefinition, FontRole } from './types.js'
import { buildFontFamily, systemMono, systemSans, systemSerif } from './utilities.js'

const BOND_TYPE = 'font'

/**
 * Registers a font definition for a specific role (`sans`, `serif`, or `mono`).
 *
 * Bonds the font via the named provider system, sets the
 * `--mol-font-{role}` CSS variable, and injects font loading
 * into the document head (CDN `<link>` tags or `@font-face` declarations).
 *
 * @param font - The font definition including family, role, and source configuration.
 */
export function setFont(font: FontDefinition): void {
  bond(BOND_TYPE, font.role, font)

  if (typeof document !== 'undefined') {
    // Apply CSS variable
    document.documentElement.style.setProperty(`--mol-font-${font.role}`, buildFontFamily(font))

    if (font.source.type === 'system') return

    // CDN fonts: inject <link> tags
    if (font.source.url) {
      const existing = document.querySelector(`link[href="${font.source.url}"]`)
      if (!existing) {
        for (const origin of font.source.preconnect ?? []) {
          const pc = document.createElement('link')
          pc.rel = 'preconnect'
          pc.href = origin
          if (origin.includes('gstatic')) pc.crossOrigin = ''
          document.head.appendChild(pc)
        }

        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = font.source.url
        document.head.appendChild(link)
      }
    }

    // Local fonts: inject @font-face declarations
    if (font.source.type === 'local' && font.source.faces) {
      const styleId = `mol-font-${font.role}`
      const existing = document.getElementById(styleId)
      if (existing) existing.remove()

      const css = font.source.faces
        .map((face) => {
          const weight = face.weight
          const style = face.style ?? 'normal'
          return `@font-face {
  font-family: '${font.family}';
  src: url('/fonts/${face.file}');
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`
        })
        .join('\n')

      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = css
      document.head.appendChild(styleEl)
    }
  }
}

/**
 * Retrieves the font definition bonded for a specific role.
 *
 * @param role - The font role (`'sans'`, `'serif'`, or `'mono'`).
 * @returns The bonded font definition, or `undefined` if none is set.
 */
export function getFont(role: FontRole): FontDefinition | undefined {
  return bondGet<FontDefinition>(BOND_TYPE, role)
}

/**
 * Checks whether a font has been bonded for a specific role.
 *
 * @param role - The font role to check.
 * @returns `true` if a font is bonded for the given role.
 */
export function hasFont(role: FontRole): boolean {
  return isBonded(BOND_TYPE, role)
}

/**
 * Returns the complete font configuration for all three roles.
 * Falls back to system font stacks for any role not explicitly set.
 *
 * @returns The resolved font config with `sans`, `serif`, and `mono` definitions.
 */
export function getFontConfig(): FontConfig {
  return {
    sans: bondGet<FontDefinition>(BOND_TYPE, 'sans') ?? systemSans,
    serif: bondGet<FontDefinition>(BOND_TYPE, 'serif') ?? systemSerif,
    mono: bondGet<FontDefinition>(BOND_TYPE, 'mono') ?? systemMono,
  }
}

/**
 * Checks whether any font role has been explicitly configured.
 *
 * @returns `true` if at least one font role is bonded.
 */
export function hasFontConfig(): boolean {
  return isBonded(BOND_TYPE, 'sans') || isBonded(BOND_TYPE, 'serif') || isBonded(BOND_TYPE, 'mono')
}

/**
 * Removes all bonded font definitions. Primarily used in tests.
 */
export function resetFonts(): void {
  unbondAll(BOND_TYPE)
}
