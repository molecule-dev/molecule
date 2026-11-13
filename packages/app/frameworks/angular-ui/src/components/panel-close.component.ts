/**
 * PanelCloseProvider and `usePanelClose` (React parity).
 *
 * React provides the close callback through a React context, which follows
 * the rendered tree — including projected children. Angular DI does not reach
 * projected content, so the value is registered on the provider's host
 * element and looked up through the DOM ancestors
 * (`utilities/dom-context.ts`), the same way React's context resolves.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnDestroy } from '@angular/core'

import { findDomContext, provideDomContext, removeDomContext } from '../utilities/dom-context.js'

/**
 * Provides the drawer-close callback to descendants.
 *
 * Rendered internally by `UserMenu` and `SidebarUserCard` around their panel
 * content; apps do not normally render it directly. The host is unwrapped
 * (`data-parity-unwrap`, React's context provider renders no DOM) and the
 * projected children render directly inside it.
 */
@Component({
  selector: 'mol-panel-close-provider',
  standalone: true,
  inputs: ['close'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<ng-content></ng-content>`,
})
export class PanelCloseProvider implements OnDestroy {
  /** Callback that dismisses the enclosing drawer/modal. */
  close?: () => void

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  /** Registers the context value on the host (before any projected child resolves it). */
  constructor() {
    provideDomContext(this.host.nativeElement, { close: () => this.close?.() })
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    removeDomContext(this.host.nativeElement)
  }
}

/**
 * Returns the callback that dismisses the drawer the current panel is
 * mounted in. Safe to call anywhere — a no-op outside a provider.
 *
 * Must be called in an injection context (a component field initializer or
 * constructor).
 *
 * @returns A function that closes the enclosing drawer, or a no-op.
 */
export function usePanelClose(): () => void {
  const el = inject(ElementRef, { optional: true }) as ElementRef<HTMLElement> | null
  // Resolved at CALL time: a probe (or panel) component resolves its context in
  // its constructor, before Angular has inserted its host into the DOM, so the
  // provider is only reachable from the ancestor walk once the tree is built.
  return () => {
    const found = findDomContext<{ close: () => void }>(el?.nativeElement ?? null)
    found?.close()
  }
}
