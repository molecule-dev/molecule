/**
 * Types for the Solid settings-page scaffold.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link SettingsLayout} component. */
export interface SettingsLayoutProps {
  /** Left-side navigation (typically `<SettingsSidebar>`). */
  sidebar?: JSX.Element
  /** Main content area (usually one or more `<SettingsSection>`s). */
  children?: JSX.Element
  /**
   * Optional header (breadcrumb, title, save button) rendered above both
   * columns. NOT sticky — apply your own sticky positioning if needed.
   */
  header?: JSX.Element
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props accepted by the {@link SettingsContent} component. */
export interface SettingsContentProps {
  /** Active section content. */
  children?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** A single navigable item in the settings sidebar. */
export interface SettingsSidebarItem {
  /** Unique id; the active item is the one whose id equals `activeId`. */
  id: string
  /** Visible label (a JSX value or plain text). */
  label: JSX.Element
  /** Optional leading icon. */
  icon?: JSX.Element
}

/** Props accepted by the {@link SettingsSidebar} component. */
export interface SettingsSidebarProps {
  /** Items to render, in order. */
  items: SettingsSidebarItem[]
  /** The id of the active item (controlled — the caller owns it). */
  activeId: string
  /** Called with the clicked item's id. */
  onSelect: (id: string) => void
  /** Optional footer inside the sidebar (sign-out, plan indicator). */
  footer?: JSX.Element
  /**
   * Accessible name for the `<nav>` region. Overrides the translated /
   * `defaultValue` `'Settings'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link SettingsSection} component. */
export interface SettingsSectionProps {
  /** Section heading. */
  title?: JSX.Element
  /** Optional description under the heading. */
  description?: JSX.Element
  /** Section body. */
  children?: JSX.Element
  /** Optional footer row (save button, last-saved indicator). */
  footer?: JSX.Element
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
