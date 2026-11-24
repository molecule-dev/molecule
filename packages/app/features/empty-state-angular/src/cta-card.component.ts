/**
 * CtaCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, signal, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  rendersNode,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { CtaCardProps } from './types.js'

/**
 * Whether a node-valued prop is an Angular template (a node) rather than plain
 * text. Checked structurally — `TemplateRef` is a type-only import in the
 * emitted metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `null` when there is none.
 */
const textOf = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null

/**
 * A "soft sell" card used to promote a next-step action inside a page body
 * (e.g., "Connect your bank", "Invite teammates").
 *
 * Differs from `<EmptyState>` in being positioned in a list of cards rather
 * than filling the void. Supports a horizontal layout with the media slot
 * beside the text.
 *
 * The host IS the outer `<section>` (`section[mol-cta-card]`), matching React's
 * root exactly. Node props are an input (a string, or a `TemplateRef`) or
 * projected content: `[slot=eyebrow]`, `[slot=title]`, `[slot=description]`,
 * `[slot=action]` and `[slot=media]`.
 *
 * This is the Angular counterpart of `@molecule/app-empty-state-react`'s
 * `CtaCard`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional regions render optimistically and {@link CtaCard.reconcile} takes
 * the ones React would not render out of the DOM ({@link setElementPresent}).
 */
@Component({
  selector: 'section[mol-cta-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: [
    'eyebrow',
    'title',
    'description',
    'action',
    'media',
    'layout',
    'dataMolId',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div #mediaEl [class]="mediaClasses()">@if (templateOf(media); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(media); as t) {{{ t }}}<ng-content select="[slot=media]"></ng-content></div><div [class]="bodyClasses()"><div #eyebrowEl [class]="eyebrowClasses()">@if (templateOf(eyebrow); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(eyebrow); as t) {{{ t }}}<ng-content select="[slot=eyebrow]"></ng-content></div><h3 [class]="titleClasses()">@if (templateOf(title); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(title); as t) {{{ t }}}<ng-content select="[slot=title]"></ng-content></h3><p #descriptionEl>@if (templateOf(description); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(description); as t) {{{ t }}}<ng-content select="[slot=description]"></ng-content></p><div #actionEl [class]="actionClasses()">@if (templateOf(action); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(action); as t) {{{ t }}}<ng-content select="[slot=action]"></ng-content></div></div>`,
})
export class CtaCard {
  /** Optional small eyebrow line above the title — a string, a `TemplateRef`, or `[slot=eyebrow]`. */
  eyebrow?: unknown
  /** Primary heading — a string, a `TemplateRef`, or `[slot=title]`. */
  title?: unknown
  /** Supporting copy — a string, a `TemplateRef`, or `[slot=description]`. */
  description?: unknown
  /** Primary call-to-action — a string, a `TemplateRef`, or `[slot=action]`. */
  action?: unknown
  /** Optional visual / illustration — a `TemplateRef`, or `[slot=media]`. */
  media?: unknown
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: CtaCardProps['layout']
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string

  /** The optional media wrapper (the projected media lands here). */
  @ViewChild('mediaEl') private mediaEl?: ElementRef<HTMLElement>
  /** The optional eyebrow wrapper (the projected eyebrow lands here). */
  @ViewChild('eyebrowEl') private eyebrowEl?: ElementRef<HTMLElement>
  /** The optional description paragraph (the projected description lands here). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLElement>
  /** The optional action wrapper (the projected action lands here). */
  @ViewChild('actionEl') private actionEl?: ElementRef<HTMLElement>

  /** Whether a `[slot=media]` projection landed. */
  private readonly mediaProjected = signal(false)
  /** Whether a `[slot=eyebrow]` projection landed. */
  private readonly eyebrowProjected = signal(false)
  /** Whether a `[slot=description]` projection landed. */
  private readonly descriptionProjected = signal(false)
  /** Whether a `[slot=action]` projection landed. */
  private readonly actionProjected = signal(false)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The layout direction (React's `layout === 'horizontal' ? 'row' : 'col'`).
   * @returns True for the horizontal layout.
   */
  horizontal(): boolean {
    return this.layout === 'horizontal'
  }

  /**
   * The host's class list (React's root `<section>` classes).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({
        direction: this.horizontal() ? 'row' : 'col',
        align: this.horizontal() ? 'center' : 'stretch',
        gap: 'md',
      }),
      cm.sp('p', 6),
      this.className,
    )
  }

  /**
   * The media wrapper's class list.
   * @returns The class string.
   */
  mediaClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The text column's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, cm.stack(2))
  }

  /**
   * The eyebrow's class list.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))
  }

  /**
   * The action wrapper's class list.
   * @returns The class string.
   */
  actionClasses(): string {
    return this.cm().sp('mt', 2)
  }

  /**
   * A node value as a template, when the caller passed one.
   * @param value - The prop value.
   * @returns The template, or null for text.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return isTemplate(value) ? value : null
  }

  /**
   * A node value as text, when the caller passed one.
   * @param value - The prop value.
   * @returns The text, or null for a template.
   */
  textOf(value: unknown): string | null {
    return textOf(value)
  }

  /**
   * Whether the media wrapper renders.
   * @returns True when a media node or a projected media is present.
   */
  showMedia(): boolean {
    return rendersNode(this.media) || this.mediaProjected()
  }

  /**
   * Whether the eyebrow renders.
   * @returns True when an eyebrow node or a projected eyebrow is present.
   */
  showEyebrow(): boolean {
    return rendersNode(this.eyebrow) || this.eyebrowProjected()
  }

  /**
   * Whether the description renders.
   * @returns True when a description node or a projected description is present.
   */
  showDescription(): boolean {
    return rendersNode(this.description) || this.descriptionProjected()
  }

  /**
   * Whether the action renders.
   * @returns True when an action node or a projected action is present.
   */
  showAction(): boolean {
    return rendersNode(this.action) || this.actionProjected()
  }

  /**
   * Reads the projected capture points and reconciles the optional wrappers.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  reconcile(hasContent: SlotReader): void {
    const media = this.mediaEl?.nativeElement
    if (media) this.mediaProjected.set(hasContent(media))
    const eyebrow = this.eyebrowEl?.nativeElement
    if (eyebrow) this.eyebrowProjected.set(hasContent(eyebrow))
    const description = this.descriptionEl?.nativeElement
    if (description) this.descriptionProjected.set(hasContent(description))
    const action = this.actionEl?.nativeElement
    if (action) this.actionProjected.set(hasContent(action))
    setElementPresent(media, this.showMedia())
    setElementPresent(eyebrow, this.showEyebrow())
    setElementPresent(description, this.showDescription())
    setElementPresent(action, this.showAction())
  }
}
