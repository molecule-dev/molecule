/**
 * Types for the Vue settings-page scaffold.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link SettingsLayout} component. */
export interface SettingsLayoutProps {
  /**
   * Left-side navigation (typically `<SettingsSidebar>`). Passed as a prop or
   * as the same-named slot — both work.
   */
  sidebar?: VNodeChild
  /** Main content area — the DEFAULT slot (usually one or more `<SettingsSection>`s). */
  children?: VNodeChild
  /**
   * Optional header (breadcrumb, title, save button) rendered above both
   * columns. NOT sticky — apply your own sticky positioning if needed. Passed
   * as a prop or as the same-named slot.
   */
  header?: VNodeChild
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props accepted by the {@link SettingsContent} component. */
export interface SettingsContentProps {
  /** Active section content — the DEFAULT slot. */
  children?: VNodeChild
  /** Extra classes. */
  className?: string
}

/** A single navigable item in the settings sidebar. */
export interface SettingsSidebarItem {
  /** Unique id; the active item is the one whose id equals `activeId`. */
  id: string
  /** Visible label (a VNode or plain text). */
  label: VNodeChild
  /** Optional leading icon (a VNode). */
  icon?: VNodeChild
}

/** Props accepted by the {@link SettingsSidebar} component. */
export interface SettingsSidebarProps {
  /** Items to render, in order. */
  items: SettingsSidebarItem[]
  /** The id of the active item (controlled — the caller owns it). */
  activeId: string
  /** Called with the clicked item's id. */
  onSelect: (id: string) => void
  /**
   * Optional footer inside the sidebar (sign-out, plan indicator). Passed as a
   * prop or as the same-named slot.
   */
  footer?: VNodeChild
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
  /** Section heading. Passed as a prop or as the same-named slot. */
  title?: VNodeChild
  /**
   * Optional description under the heading. Passed as a prop or as the
   * same-named slot.
   */
  description?: VNodeChild
  /** Section body — the DEFAULT slot. */
  children?: VNodeChild
  /**
   * Optional footer row (save button, last-saved indicator). Passed as a prop
   * or as the same-named slot.
   */
  footer?: VNodeChild
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
