/**
 * Imperative mount helper — the real drop-in entry point.
 *
 * Mounts the widget into a host element with a single call and NO molecule
 * composition wiring. Because the widget degrades gracefully (English defaults +
 * inline styling when no i18n provider is composed), this is
 * all a bare third-party page needs to stand the widget up.
 *
 * @module
 */

import { type App, createApp, h } from 'vue'

import { EmbeddableChatWidget } from './EmbeddableChatWidget.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

/** Options for {@link mountEmbeddableChatWidget}. */
export interface MountEmbeddableChatWidgetOptions {
  /** Start with the panel expanded instead of the collapsed launcher. */
  defaultOpen?: boolean
}

/**
 * Mounts the embeddable chat widget into a host container. Works on a bare
 * page — no molecule i18n provider, ClassMap bond, or stylesheet required.
 *
 * Unlike React's `mountEmbeddableChatWidget`, the handle this returns is
 * Vue's own `App` instance: call `.unmount()` on it to tear the widget down
 * (the framework-shaped counterpart of React's `Root`).
 *
 * @param container - The target element, or a CSS selector resolving to one.
 * @param config - Widget configuration (`apiBaseUrl`, `brandName`, …).
 * @param options - Optional mount options (see {@link MountEmbeddableChatWidgetOptions}).
 * @returns The Vue `App`; call `.unmount()` to tear the widget down.
 * @throws {Error} If a selector string resolves to no element.
 *
 * @example
 * ```ts
 * import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget-vue'
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
): App<Element> {
  const element =
    typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
  if (!element) {
    throw new Error(`mountEmbeddableChatWidget: no element found for container "${container}"`)
  }
  const app = createApp({
    name: 'EmbeddableChatWidgetMount',
    render: () => h(EmbeddableChatWidget, { config, defaultOpen: options.defaultOpen }),
  })
  app.mount(element)
  return app
}
