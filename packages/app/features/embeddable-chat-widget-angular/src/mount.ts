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

import { type ApplicationRef, createComponent, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { EmbeddableChatWidget } from './embeddable-chat-widget.component.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

/** Options for {@link mountEmbeddableChatWidget}. */
export interface MountEmbeddableChatWidgetOptions {
  /** Start with the panel expanded instead of the collapsed launcher. */
  defaultOpen?: boolean
}

/**
 * Mounts the embeddable chat widget into a host container. Works on a bare
 * page — no molecule i18n provider, `setClassMap()`, or stylesheet required.
 *
 * Unlike React's `mountEmbeddableChatWidget`, Angular boots asynchronously:
 * this returns a promise of the Angular `ApplicationRef` (the
 * framework-shaped counterpart of React's `Root`); call `.destroy()` on it
 * to tear the widget down.
 *
 * @param container - The target element, or a CSS selector resolving to one.
 * @param config - Widget configuration (`apiBaseUrl`, `brandName`, …).
 * @param options - Optional mount options (see {@link MountEmbeddableChatWidgetOptions}).
 * @returns The Angular `ApplicationRef`; call `.destroy()` to tear the widget down.
 * @throws {Error} If a selector string resolves to no element.
 *
 * @example
 * ```ts
 * import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget-angular'
 *
 * await mountEmbeddableChatWidget('#chat', {
 *   apiBaseUrl: 'https://api.example.com',
 *   brandName: 'Acme',
 * })
 * ```
 */
export async function mountEmbeddableChatWidget(
  container: string | HTMLElement,
  config: EmbeddableChatWidgetConfig,
  options: MountEmbeddableChatWidgetOptions = {},
): Promise<ApplicationRef> {
  const element =
    typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
  if (!element) {
    throw new Error(`mountEmbeddableChatWidget: no element found for container "${container}"`)
  }
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const componentRef = createComponent(EmbeddableChatWidget, {
    environmentInjector: appRef.injector,
    hostElement: element,
  })
  componentRef.setInput('config', config)
  componentRef.setInput('defaultOpen', options.defaultOpen)
  appRef.attachView(componentRef.hostView)
  // Render once before returning, the way React's `root.render()`, Vue's
  // `app.mount()` and Solid's `render()` do synchronously.
  appRef.tick()
  return appRef
}
