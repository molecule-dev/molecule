/**
 * Types of `@molecule/app-settings-container-angular` — the Angular
 * counterpart of `@molecule/app-settings-container-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by the settings layout — the same props
 * `@molecule/app-settings-container-react`'s `SettingsLayout` accepts.
 * Node props (`sidebar`, `header`, `children`) are projected content in
 * Angular (an input cannot carry a node), so they are typed `unknown`: pass
 * them in the host template as `[slot=sidebar]`, `[slot=header]` and default
 * content.
 */
export interface SettingsLayoutProps {
  /** Left-side navigation, projected as `[slot=sidebar]` content. */
  sidebar?: unknown
  /** Main content area, projected as the element's default content. */
  children?: unknown
  /** Optional header, projected as `[slot=header]` content. */
  header?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Props accepted by the content wrapper — the same props React's
 * `SettingsContent` accepts. Its only node prop (`children`) is projected
 * default content.
 */
export interface SettingsContentProps {
  /** Active section content, projected as the element's default content. */
  children?: unknown
  /** Extra classes. */
  className?: string
}

/** A single navigable item in the settings sidebar. */
export interface SettingsSidebarItem {
  /** Unique id; the active item is the one whose id equals `activeId`. */
  id: string
  /** Visible label — a projected node template, or plain text. */
  label: unknown
  /** Optional leading icon — a projected node template, or plain text. */
  icon?: unknown
}

/**
 * Props accepted by the settings sidebar — the same props React's
 * `SettingsSidebar` accepts. `footer` is projected as `[slot=footer]`
 * content, or passed as text.
 */
export interface SettingsSidebarProps {
  /** Items to render, in order. */
  items: SettingsSidebarItem[]
  /** The id of the active item (controlled — the caller owns it). */
  activeId: string
  /** Called with the clicked item's id. */
  onSelect: (id: string) => void
  /** Optional footer, projected as `[slot=footer]` content or passed as text. */
  footer?: unknown
  /**
   * Accessible name for the `<nav>` region. Overrides the translated /
   * `defaultValue` `'Settings'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by the settings section — the same props React's
 * `SettingsSection` accepts. `title`, `description` and `footer` are node
 * props: projected content (`[slot=title]`, `[slot=description]`,
 * `[slot=footer]`) or plain text.
 */
export interface SettingsSectionProps {
  /** Section heading — a projected node template, or plain text. */
  title?: unknown
  /** Optional description under the heading — a projected node template, or plain text. */
  description?: unknown
  /** Section body, projected as the element's default content. */
  children?: unknown
  /** Optional footer row — a projected node template, or plain text. */
  footer?: unknown
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
