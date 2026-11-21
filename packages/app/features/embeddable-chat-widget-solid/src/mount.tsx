/**
 * Imperative mount helper — the real drop-in entry point.
 *
 * Mounts the widget into a host element with a single call and NO molecule
 * provider wiring. Because the widget degrades gracefully (English defaults +
 * inline styling when no i18n provider / ClassMap bond is present), this is
 * all a bare third-party page needs to stand the widget up.
 *
 * @module
 */

import { render } from 'solid-js/web'

import { EmbeddableChatWidget } from './EmbeddableChatWidget.jsx'
import type { EmbeddableChatWidgetConfig } from './types.js'

/** The handle {@link mountEmbeddableChatWidget} returns (Solid's disposer). */
interface MountedEmbeddableChatWidget {
  /** Tears the widget down and disposes its reactive graph. */
  dispose(): void
}

/** Options for {@link mountEmbeddableChatWidget}. */
export interface MountEmbeddableChatWidgetOptions {
  /** Start with the panel expanded instead of the collapsed launcher. */
  defaultOpen?: boolean
}

/**
 * Mounts the embeddable chat widget into a host container. Works on a bare
 * page — no molecule i18n provider, `setClassMap()`, or stylesheet required.
 *
 * Unlike React's `mountEmbeddableChatWidget`, the handle this returns is
 * Solid's disposer (the framework-shaped counterpart of React's `Root`).
 *
 * @param container - The target element, or a CSS selector resolving to one.
 * @param config - Widget configuration (`apiBaseUrl`, `brandName`, …).
 * @param options - Optional mount options (see {@link MountEmbeddableChatWidgetOptions}).
 * @returns The Solid disposer; call `.dispose()` to tear the widget down.
 * @throws {Error} If a selector string resolves to no element.
 *
 * @example
 * ```ts
 * import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget-solid'
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
): MountedEmbeddableChatWidget {
  const element =
    typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
  if (!element) {
    throw new Error(`mountEmbeddableChatWidget: no element found for container "${container}"`)
  }
  const dispose = render(
    () => <EmbeddableChatWidget config={config} defaultOpen={options.defaultOpen} />,
    element,
  )
  return { dispose }
}
