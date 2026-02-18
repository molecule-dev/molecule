/**
 * Font type definitions for molecule.dev.
 *
 * @module
 */

/** How a font is loaded. */
export type FontSourceType = 'google' | 'bunny' | 'local' | 'system' | 'custom'

/** Which font role this font fills. */
export type FontRole = 'sans' | 'serif' | 'mono'

/** Descriptor for a single `@font-face` declaration (local fonts). */
export interface FontFaceDescriptor {
  /** Font filename relative to the package's fontsDir (e.g., 'Arimo-Regular.ttf'). */
  file: string
  /** CSS font-weight value — number (400) or range string ('100 1000'). */
  weight: number | string
  /** CSS font-style: 'normal' or 'italic'. Defaults to 'normal'. */
  style?: string
  /** If true, this is a variable font — wrap in `@supports` (font-variation-settings: normal). */
  variable?: boolean
}

/** Font loading source information. */
export interface FontSource {
  /** The source type for loading. */
  type: FontSourceType
  /** Full URL for the font CSS stylesheet (for google/bunny/custom). */
  url?: string
  /** Preconnect origins (e.g., ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']). */
  preconnect?: string[]
  /** `@font-face` descriptors for local font files. */
  faces?: FontFaceDescriptor[]
}

/** Complete definition for a single font family. */
export interface FontDefinition {
  /** CSS font-family name (e.g., 'Arimo', 'Inter'). */
  family: string
  /** Which role this font fills (sans, serif, or mono). */
  role: FontRole
  /** Fallback fonts appended after the family in the CSS value. */
  fallbacks: string[]
  /** How to load this font. */
  source: FontSource
}

/** Resolved font configuration for all three roles. */
export interface FontConfig {
  sans: FontDefinition
  serif: FontDefinition
  mono: FontDefinition
}
