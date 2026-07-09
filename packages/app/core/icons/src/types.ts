/**
 * Icon set interfaces for molecule.dev.
 *
 * @module
 */

/** Single SVG path element data. */
export interface IconPath {
  d: string
  fill?: string
  fillRule?: 'evenodd' | 'nonzero'
  clipRule?: 'evenodd' | 'nonzero'
  opacity?: number
}

/** Complete icon definition — framework-agnostic SVG data. */
export interface IconData {
  /** SVG path elements. */
  paths: IconPath[]
  /** viewBox attribute. Default: "0 0 20 20" */
  viewBox?: string
  /** fill attribute. Default: "currentColor" */
  fill?: string
  /** stroke attribute (for outlined icons). */
  stroke?: string
  /** strokeWidth for outlined icons. */
  strokeWidth?: number
  /** strokeLinecap for outlined icons. */
  strokeLinecap?: 'round' | 'butt' | 'square'
  /** strokeLinejoin for outlined icons. */
  strokeLinejoin?: 'round' | 'miter' | 'bevel'
  /** Raw inner SVG content for complex icons that can't be represented as paths alone. */
  svg?: string
}

/** A named set of icons. */
export interface IconSet {
  [name: string]: IconData
}

/**
 * Augmentable registry of extra icon names beyond {@link ComponentIconName}.
 *
 * An icon set bond (or an app merging custom glyphs into the bonded set) that
 * provides names beyond the required contract declares them here so
 * `getIcon()` / `<Icon name="…" />` accept them type-safely:
 *
 * ```typescript
 * declare module '@molecule/app-icons' {
 *   interface CustomIconNames {
 *     'my-custom-glyph': true
 *   }
 * }
 * ```
 *
 * Keys are icon names; values are always `true` (the interface is a name
 * registry, never instantiated).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration-merging target (like i18next's CustomTypeOptions); empty until augmented
export interface CustomIconNames {}

/**
 * Every icon name known to the type system: the {@link ComponentIconName}
 * contract every icon set must provide, plus any {@link CustomIconNames}
 * augmentations. Use this for `getIcon()` arguments and `icon`/`name` props so
 * a typo fails the type-check instead of throwing at render time.
 */
export type IconName = ComponentIconName | (keyof CustomIconNames & string)

/**
 * Icons required by UI components.
 * All icon set providers MUST include these.
 */
export type ComponentIconName =
  // Status
  | 'info-circle'
  | 'check-circle'
  | 'exclamation-triangle'
  | 'x-circle'
  // Close/dismiss
  | 'x-mark'
  // Navigation arrows
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  // Chevrons
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'chevrons-up-down'
  // Common actions
  | 'search'
  | 'plus'
  | 'minus'
  | 'check'
  | 'pencil'
  | 'trash'
  | 'copy'
  | 'download'
  | 'upload'
  | 'share'
  | 'link'
  | 'link-external'
  | 'filter'
  | 'sort-asc'
  | 'sort-desc'
  | 'sync'
  // UI controls
  | 'ellipsis-horizontal'
  | 'eye'
  | 'eye-closed'
  | 'gear'
  | 'lock'
  | 'unlock'
  | 'home'
  | 'globe'
  | 'menu'
  | 'maximize'
  | 'minimize'
  // User
  | 'user'
  | 'people'
  | 'sign-in'
  | 'sign-out'
  // Theme
  | 'sun'
  | 'moon'
  // Notifications
  | 'bell'
  // Content
  | 'file'
  | 'folder'
  | 'calendar'
  | 'clock'
  | 'history'
  | 'tag'
  | 'star'
  | 'heart'
  | 'code'
  | 'mail'
  // Misc
  | 'bug'
  | 'lightbulb'
  | 'mention'
  | 'microphone'
  | 'paperclip'
  | 'question'
  | 'bookmark'
  | 'pin'
  | 'reply'
  | 'image'
  | 'table'
  | 'thumbsup'
  | 'thumbsdown'
  // Brand
  | 'logo-mark'
  | 'logo-dot'
  | 'github'
  | 'google'
  | 'gitlab'
  | 'twitter'
