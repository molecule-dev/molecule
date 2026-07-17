/**
 * Imperative mount helper — the real drop-in entry point.
 *
 * Renders the widget into a host element with a single call and NO molecule
 * provider wiring. Because the widget degrades gracefully (English defaults +
 * inline styling when no `I18nProvider` / ClassMap bond is present), this is
 * all a bare third-party page needs to stand the widget up.
 *
 * @module
 */

import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { EmbeddableChatWidget } from './EmbeddableChatWidget.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

/** Options for {@link mountEmbeddableChatWidget}. */
export interface MountEmbeddableChatWidgetOptions {
  /** Start with the panel expanded instead of the collapsed launcher. */
  defaultOpen?: boolean
}

/**
 * Mounts the embeddable chat widget into a host container. Works on a bare
 * page — no `I18nProvider`, `setClassMap()`, or molecule stylesheet required.
 *
 * @param container - The target element, or a CSS selector resolving to one.
 * @param config - Widget configuration (`apiBaseUrl`, `brandName`, …).
 * @param options - Optional mount options (see {@link MountEmbeddableChatWidgetOptions}).
 * @returns The React `Root`; call `.unmount()` to tear the widget down.
 * @throws {Error} If a selector string resolves to no element.
 *
 * @example
 * ```ts
 * import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
 *
 * mountEmbeddableChatWidget('#chat', {
 *   apiBaseUrl: 'https://api.example.com',
 *   brandName: 'Acme',
 * })
 * ```
 */
export function mountEmbeddableChatWidget(
  container: string | HTMLElement,
  config: EmbeddableChatWidgetConfig,
  options: MountEmbeddableChatWidgetOptions = {},
): Root {
  const element =
    typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
  if (!element) {
    throw new Error(`mountEmbeddableChatWidget: no element found for container "${container}"`)
  }
  const root = createRoot(element)
  root.render(createElement(EmbeddableChatWidget, { config, defaultOpen: options.defaultOpen }))
  return root
}
