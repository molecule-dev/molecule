/**
 * Drop-in floating chat widget for third-party sites. Angular counterpart of
 * `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatWidget` — the same
 * props (React names), the same DOM.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnInit, signal } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

import { EmbeddableChatLauncher } from './embeddable-chat-launcher.component.js'
import { EmbeddableChatPanel } from './embeddable-chat-panel.component.js'
import type { EmbeddableChatWidgetConfig, EmbeddableChatWidgetPosition } from './types.js'

/**
 * Drop-in floating chat widget for third-party sites. Renders a
 * collapsed launcher in the configured corner; clicking expands a
 * 360x540px panel with a message list, typing indicator, and input.
 *
 * The widget is intentionally self-contained — all geometry, colors,
 * and shadows are inlined so the host site does not need to ship the
 * molecule stylesheet. Pair with `@molecule/app-locales-embeddable-chat-widget`
 * for translations.
 *
 * React's root is a fragment (the launcher OR the panel, never a wrapper), so
 * the chosen half renders in the host's place and the host itself contributes
 * no element to the page: the rendered DOM is React's button or section alone.
 */
@Component({
  selector: 'mol-embeddable-chat-widget',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [EmbeddableChatLauncher, EmbeddableChatPanel],
  inputs: ['config', 'defaultOpen'],
  // prettier-ignore
  template: `@if (!open()) {
    <mol-embeddable-chat-launcher
      [visible]="true"
      (open)="openWidget()"
      [position]="position()"
      [theme]="config?.theme"
    />
  }
  @if (open()) {
    <mol-embeddable-chat-panel
      [visible]="true"
      (close)="closeWidget()"
      [position]="position()"
      [config]="config"
    />
  }`,
})
export class EmbeddableChatWidget implements OnInit {
  /** Widget configuration. */
  config?: EmbeddableChatWidgetConfig
  /** Optional initial expanded state (default: collapsed). */
  defaultOpen?: boolean

  private readonly expanded = signal(false)
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React renders a fragment of one child; everything the host holds
    // (the @if anchors and the child element) renders in the host's place.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /** @inheritdoc */
  ngOnInit(): void {
    // React seeds the state from the `defaultOpen` PROP VALUE once; a later
    // input write never re-expands the panel.
    this.expanded.set(this.defaultOpen ?? false)
  }

  /**
   * The current expanded state.
   * @returns True when the panel shows.
   */
  open(): boolean {
    return this.expanded()
  }

  /**
   * The resolved floating corner.
   * @returns The position.
   */
  position(): EmbeddableChatWidgetPosition {
    return this.config?.position ?? 'bottom-right'
  }

  /** Expands to the panel (the launcher was clicked). */
  openWidget(): void {
    this.expanded.set(true)
  }

  /** Collapses back to the launcher (the panel was closed). */
  closeWidget(): void {
    this.expanded.set(false)
  }
}
