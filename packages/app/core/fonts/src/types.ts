/**
 * Font type definitions for molecule.dev.
 *
 * @module
 */

/** How a font is loaded. */
export type FontSourceType = 'google' | 'bunny' | 'local' | 'system' | 'custom'

/**
 * Which font role this font fills.
 *
 * `sans`/`serif`/`mono` are text roles applied app-wide via `--mol-font-{role}`.
 * `icon` is for icon fonts (e.g. Material Symbols) — consumed through a utility
 * class (`.material-symbols-outlined`), not a text `font-family`, so an `icon`
 * font carries `utilityCss` that `setFont()` injects alongside its `@font-face`.
 */
export type FontRole = 'sans' | 'serif' | 'mono' | 'icon'

/** Descriptor for a single `@font-face` declaration (local fonts). */
export interface FontFaceDescriptor {
  /**
   * Font file: a filename relative to the package's fontsDir
   * (e.g., 'Arimo-Regular.woff2'), or an already-final URL — a root-absolute
   * asset path (`/assets/Arimo-1a2b.woff2`), a full `http(s):` URL or a
   * `data:` URL — which `setFont()` uses as-is. That is the shape a bundler
   * emits for `import woff2 from '…Arimo-Regular.woff2?url'`.
   */
  file: string
  /** CSS font-weight value — number (400) or range string ('100 1000'). */
  weight: number | string
  /** CSS font-style: 'normal' or 'italic'. Defaults to 'normal'. */
  style?: string
  /** If true, this is a variable font — wrap in `@supports` (font-variation-settings: normal). */
  variable?: boolean
  /** CSS source format hint, e.g. 'woff2'. Omit for automatic detection by the browser. */
  format?: string
  /** CSS unicode-range, e.g. 'U+0000-00FF'. Omit to use the entire character map. */
  unicodeRange?: string
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

/**
 * What a renderer without ligatures or variable axes (React Native) needs to draw an icon font's
 * glyphs by name.
 */
export interface FontGlyphs {
  /**
   * The codepoint that draws a glyph name.
   *
   * @param name - The glyph name (`check_circle`).
   * @returns The codepoint, or `undefined` for a name the font does not draw.
   */
  codepoint(name: string): number | undefined
  /** The family of the font's filled form (its `FILL` axis at 1), when it has one. */
  filledFamily?: string
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
  /**
   * Extra CSS injected verbatim after this font's `@font-face` block — the
   * utility class an icon font needs (e.g. `.material-symbols-outlined { … }`).
   * Only meaningful for `icon`-role fonts; ignored for text roles.
   */
  utilityCss?: string
  /** An icon font's glyphs by name, for a renderer that draws them by codepoint. */
  glyphs?: FontGlyphs
  /**
   * The font files a React Native app loads before it renders (the map expo-font's `loadAsync`
   * takes: family name to bundled asset). A definition for React Native carries them, with a
   * `system` source, since the platform loads the files.
   */
  nativeFiles?: Readonly<Record<string, number>>
}

/** Options for `setFont()`. */
export interface SetFontOptions {
  /**
   * The public base path the app is served under — Vite's `base`
   * (`import.meta.env.BASE_URL`), `/blog/` for a site under a sub-path.
   * Local faces are loaded from `<basePath>fonts/<file>`. When omitted the
   * document's `<base href>`, then `import.meta.env.BASE_URL`, then `/` apply.
   */
  basePath?: string
}

/** Resolved font configuration for all three roles. */
export interface FontConfig {
  sans: FontDefinition
  serif: FontDefinition
  mono: FontDefinition
}
