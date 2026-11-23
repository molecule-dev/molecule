/**
 * StorefrontAnnouncementBar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, type TemplateRef, ViewChild } from '@angular/core'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isNodeTemplate, nodeText } from './internal.js'

/**
 * Storefront announcement / promo bar.
 *
 * The host IS the root `<div>` (`div[mol-storefront-announcement-bar]`),
 * matching React's root exactly. The `message` node prop is projected content
 * (`[slot=message]`) or a plain text input; the projected content renders bare
 * in the message's place (the capture span never reaches the page); a
 * node-valued CTA label arrives as an `ng-template` reference and renders
 * through `NgTemplateOutlet`. The CTA itself is the binding's router `Link`
 * (`<a molLink>`), react-router's `<Link to>` contract. Same props, same DOM as
 * `@molecule/app-storefront-chrome-react`'s `StorefrontAnnouncementBar`.
 */
@Component({
  selector: 'div[mol-storefront-announcement-bar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Link, NgTemplateOutlet],
  inputs: ['message', 'cta', 'className'],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `@if (messageTemplate(); as msgTpl) {<ng-container [ngTemplateOutlet]="msgTpl"></ng-container>}<span #messageSlot><ng-content select="[slot=message]"></ng-content></span>@if (hasTextMessage()) {<ng-container>{{ message }}</ng-container>}@if (hasCta()) {<ng-container>{{ ' ' }}</ng-container><a [molLink]="ctaTo()" [class]="linkClasses()" data-mol-id="announcement-link">@if (ctaLabelTemplate(); as label) {<ng-container [ngTemplateOutlet]="label"></ng-container>}@if (hasTextCtaLabel()) {<ng-container>{{ ctaLabelText() }}</ng-container>}</a>}`,
})
export class StorefrontAnnouncementBar {
  /** The promo message — a text input, or `[slot=message]` projected content. */
  message?: unknown
  /** Optional call to action, rendered as a router link after the message. */
  cta?: { to: string; label?: unknown }
  /** Extra classes on the bar. */
  className?: string

  /** The projected message capture point (its content renders bare in place). */
  @ViewChild('messageSlot') private messageSlot?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => {
      const slot = this.messageSlot?.nativeElement
      if (!slot) return
      // React renders the projected message bare; the capture span leaves the page.
      hasContent(slot)
      placeContentBefore(slot, slot)
      setElementPresent(slot, false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The bar's class list (React's `cm.cn(…)` over the same tokens).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().textCenter,
      this.cm().sp('px', 4),
      this.cm().textSize('sm'),
      this.cm().fontWeight('medium'),
      this.cm().storefrontChromeAnnouncementBar,
      this.className,
    )
  }

  /**
   * The CTA link's class list (`cm.storefrontChromeAnnouncementLink`).
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().storefrontChromeAnnouncementLink)
  }

  /**
   * The message as a template, when the caller passed a node as the input.
   * @returns The template, or null for text or projected content.
   */
  messageTemplate(): TemplateRef<unknown> | null {
    return isNodeTemplate(this.message) ? this.message : null
  }

  /**
   * Whether the message renders as a text input (a projected message is not).
   * @returns True when the message interpolates as text.
   */
  hasTextMessage(): boolean {
    return hasText(this.message)
  }

  /**
   * Whether the CTA renders (React's `cta ? … : null`).
   * @returns True when a CTA was passed.
   */
  hasCta(): boolean {
    return Boolean(this.cta)
  }

  /**
   * The CTA destination (read after {@link StorefrontAnnouncementBar.hasCta}).
   * @returns The path.
   */
  ctaTo(): string {
    return this.cta?.to ?? ''
  }

  /**
   * The CTA label as a template, when the caller passed a node.
   * @returns The template, or null for text or an absent label.
   */
  ctaLabelTemplate(): TemplateRef<unknown> | null {
    const label = this.cta?.label
    return isNodeTemplate(label) ? label : null
  }

  /**
   * Whether the CTA label renders as text.
   * @returns True when the label interpolates as text.
   */
  hasTextCtaLabel(): boolean {
    return hasText(this.cta?.label)
  }

  /**
   * The CTA label's text.
   * @returns The text, or the empty string for a template or an absent label.
   */
  ctaLabelText(): string {
    return nodeText(this.cta?.label)
  }
}
