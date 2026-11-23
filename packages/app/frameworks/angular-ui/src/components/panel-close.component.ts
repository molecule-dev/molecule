/**
 * PanelCloseProvider and `usePanelClose` (React parity).
 *
 * React provides the close callback through a React context, which follows
 * the rendered tree — including projected children. Angular DI does not reach
 * projected content, so the value is registered on a DOM element and looked
 * up through the DOM ancestors (`utilities/dom-context.ts`), the same way
 * React's context resolves.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnDestroy } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

import { createDomContext } from '../utilities/dom-context.js'

/**
 * Props for {@link PanelCloseProvider} (React's `PanelCloseProviderProps`, in
 * Angular's form). The panel content is projected content, so it has no
 * member.
 */
export interface PanelCloseProviderProps {
  /** Callback that dismisses the enclosing drawer/modal. */
  close: () => void
}

/**
 * Provides the drawer-close callback to descendants.
 *
 * Rendered internally by `UserMenu` and `SidebarUserCard` around their panel
 * content; apps do not normally render it directly. React's context provider
 * renders its children and no DOM of its own, so the projected children
 * render in front of the host (`placeContentBefore`) and the host itself
 * leaves the page. The context is registered on the parent element — the one
 * whose child list the content now belongs to — so a consumer in the content
 * still resolves it from its DOM ancestors.
 */
@Component({
  selector: 'mol-panel-close-provider',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['close'],
  template: `<ng-content></ng-content>`,
})
export class PanelCloseProvider implements OnDestroy {
  /** Callback that dismisses the enclosing drawer/modal. */
  close?: PanelCloseProviderProps['close']

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  /** The value consumers read; its closure keeps the CURRENT `close` prop. */
  private readonly value = { close: (): void => this.close?.() }

  /** Renders the children in front of the host and registers the context where they render. */
  constructor() {
    const host = this.host.nativeElement
    PanelCloseDomContext.provide(host, this.value)
    usePlacement(() => {
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    PanelCloseDomContext.remove(this.host.nativeElement)
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
    const found = PanelCloseDomContext.find(el?.nativeElement ?? null)
    found?.close()
  }
}

/** The context a provider registers and its consumers find. */
const PanelCloseDomContext = createDomContext<{ close: () => void }>('PanelCloseDomContext')
