/**
 * Types of `@molecule/app-action-menu-angular` — the Angular counterpart of
 * `@molecule/app-action-menu-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

/** A single item in the ActionMenu list. */
export interface ActionMenuItem {
  /** Unique id. */
  id: string
  /**
   * Label: text, or a node — which arrives as an `ng-template` reference and
   * renders through `NgTemplateOutlet` (an input cannot carry a node).
   */
  label: unknown
  /** Optional leading icon: text, or a node (an `ng-template` reference). */
  icon?: unknown
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

/**
 * Props accepted by {@link ActionMenu} — the same props
 * `@molecule/app-action-menu-react` accepts. The node props (`trigger`) are
 * projected content in Angular (an input cannot carry a node) or a template
 * reference passed as the input, so they are typed `unknown`.
 */
export interface ActionMenuProps {
  /** Items to render. */
  items: ActionMenuItem[]
  /** Trigger content, projected as `[slot=trigger]` content or passed as a template reference. */
  trigger?: unknown
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
