/**
 * Types of `@molecule/app-settings-container-svelte` — the Svelte counterpart
 * of `@molecule/app-settings-container-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link SettingsLayout} component. */
export interface SettingsLayoutProps {
  /** Left-side navigation (typically `<SettingsSidebar>`). */
  sidebar?: Snippet
  /** Main content area (usually one or more `<SettingsSection>`s) — the default content. */
  children?: Snippet
  /**
   * Optional header (breadcrumb, title, save button) rendered above both
   * columns. NOT sticky — apply your own sticky positioning if needed.
   */
  header?: Snippet
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props accepted by the {@link SettingsContent} component. */
export interface SettingsContentProps {
  /** Active section content — the default content. */
  children?: Snippet
  /** Extra classes. */
  className?: string
}

/** A single navigable item in the settings sidebar. */
export interface SettingsSidebarItem {
  /** Unique id; the active item is the one whose id equals `activeId`. */
  id: string
  /** Visible label — a snippet or plain text. */
  label: Snippet | string
  /** Optional leading icon — a snippet or plain text. */
  icon?: Snippet | string
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
  footer?: Snippet | string
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
  /** Section heading — a snippet or plain text. */
  title?: Snippet | string
  /** Optional description under the heading — a snippet or plain text. */
  description?: Snippet | string
  /** Section body — the default content. */
  children?: Snippet
  /** Optional footer row (save button, last-saved indicator) — a snippet or plain text. */
  footer?: Snippet | string
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
