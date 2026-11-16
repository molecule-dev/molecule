/**
 * Types of `@molecule/app-action-menu-solid` — the Solid counterpart of
 * `@molecule/app-action-menu-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single item in the ActionMenu list. */
export interface ActionMenuItem {
  /** Unique id. */
  id: string
  /** Label: text, or JSX. */
  label: JSX.Element
  /** Optional leading icon: JSX. */
  icon?: JSX.Element
  /** Click handler. */
  onClick?: () => void
  /** Href — when present, the item renders as an anchor instead of a button. */
  href?: string
  /** When true, rendered in a disabled state. */
  disabled?: boolean
  /**
   * Marks the item as destructive. Rendered in the theme's error color
   * (`cm.textError`) with semibold weight, so it reads as red in both light
   * and dark themes.
   */
  destructive?: boolean
  /** Insert a divider below this item. */
  divider?: boolean
}

/** Props accepted by the {@link ActionMenu} component. */
export interface ActionMenuProps {
  /** Items to render. */
  items: ActionMenuItem[]
  /** Trigger content — usually a kebab icon. Defaults to "⋮". */
  trigger?: JSX.Element
  /** Menu alignment relative to the trigger. Defaults to `'right'`. */
  align?: 'left' | 'right'
  /**
   * Accessible label for the trigger button. Overrides the translated /
   * `defaultValue` `'Actions'` (prop > `t()` > default).
   */
  triggerAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
