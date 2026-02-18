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
