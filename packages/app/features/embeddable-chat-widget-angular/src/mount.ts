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

import { provideDomPlacement } from '@molecule/app-angular'

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
    // The widget's hosts leave the DOM via the placement rules; on a bare page
    // nothing else provides them, so the mount helper supplies them itself.
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  // React renders the widget INTO the container and keeps it. Angular mounts a
  // component on a host element, so the widget gets its own child host inside
  // the container; that host leaves the DOM and the button/section stay as the
  // container's children, exactly as React's `root.render()` leaves them.
  const host = document.createElement('div')
  element.appendChild(host)
  const componentRef = createComponent(EmbeddableChatWidget, {
    environmentInjector: appRef.injector,
    hostElement: host,
  })
  componentRef.setInput('config', config)
  componentRef.setInput('defaultOpen', options.defaultOpen)
  appRef.attachView(componentRef.hostView)
  // Render once before returning, the way React's `root.render()`, Vue's
  // `app.mount()` and Solid's `render()` do synchronously.
  appRef.tick()
  return appRef
}
