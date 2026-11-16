/**
 * EmptyState component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type Renderer2,
  RendererFactory2,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'
import type { EmptyStateProps } from './types.js'

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
 * Generic centred empty-state panel for lists, feeds, boards, and tables.
 *
 * Renders a vertical stack of [icon, title, description, action]. Typography
 * and spacing come from the wired ClassMap; per-app accent chrome (dashed
 * borders, tinted backgrounds, gradient CTAs) is passed via `className` on the
 * outer element.
 *
 * The host IS the outer `<section>` (`section[mol-empty-state]`), matching
 * React's root exactly. Node props are an input (a string, or a `TemplateRef`)
 * or projected content: `[slot=icon]`, `[slot=title]`, `[slot=description]` and
 * `[slot=action]`.
 *
 * This is the Angular counterpart of `@molecule/app-empty-state-react`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional icon badge and description render optimistically and
 * {@link EmptyState.ngDoCheck} detaches the ones React would not render. A
 * selected `view` owns its message: the view's own content is rendered, so an
 * app passes either a view or the generic message, never both.
 */
@Component({
  selector: 'section[mol-empty-state]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'icon',
    'title',
    'description',
    'action',
    'view',
    'dataMolId',
    'className',
    'iconWrapperClassName',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div #iconEl [class]="iconWrapperClasses()">@if (templateOf(icon); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(icon); as t) {{{ t }}}<ng-content select="[slot=icon]"></ng-content></div><h3 [class]="titleClasses()">@if (templateOf(content().title); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(content().title); as t) {{{ t }}}<ng-content select="[slot=title]"></ng-content></h3><p #descriptionEl [class]="descriptionClasses()">@if (templateOf(content().description); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(content().description); as t) {{{ t }}}<ng-content select="[slot=description]"></ng-content></p><div #actionEl data-parity-unwrap>@if (templateOf(content().action); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (textOf(content().action); as t) {{{ t }}}<ng-content select="[slot=action]"></ng-content></div>`,
})
export class EmptyState implements AfterViewInit, DoCheck {
  /** Visual — an icon node as a `TemplateRef`, a string, or `[slot=icon]` content. */
  icon?: unknown
  /** Primary heading for a general, unselected collection. */
  title?: unknown
  /** Supporting description shown below the heading. */
  description?: unknown
  /** Optional action for a general empty state. */
  action?: unknown
  /** The selected view's translated message and required recovery element. */
  view?: EmptyStateProps['view']
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string

  /** The optional icon badge (the projected icon lands here). */
  @ViewChild('iconEl') private iconEl?: ElementRef<HTMLElement>
  /** The optional description paragraph (the projected description lands here). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLElement>
  /** The action's capture point (the projected action lands here). */
  @ViewChild('actionEl') private actionEl?: ElementRef<HTMLElement>

  /** The host element (the outer `<section>`). */
  private readonly host = inject(ElementRef<HTMLElement>)
  /** The DOM renderer, for the wrapper attach/detach. */
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null)
  /** Reconciles the optional wrappers against React's DOM. */
  private readonly guard = new SlotGuard(this.host, this.renderer)
  /** Whether a `[slot=icon]` projection landed. */
  private readonly iconProjected = signal(false)
  /** Whether a `[slot=description]` projection landed. */
  private readonly descriptionProjected = signal(false)
  /** Whether a `[slot=action]` projection landed. */
  private readonly actionProjected = signal(false)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (React's root `<section>` classes).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
      cm.textCenter,
      cm.sp('p', 12),
      this.className,
    )
  }

  /**
   * The icon badge's class list.
   * @returns The class string.
   */
  iconWrapperClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.w(20),
      cm.h(20),
      cm.roundedFull,
      cm.flex({ align: 'center', justify: 'center' }),
      cm.sp('mb', 6),
      this.iconWrapperClassName,
    )
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))
  }

  /**
   * The description paragraph's class list (React's `mb` follows a present action).
   * @returns The class string.
   */
  descriptionClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.maxW('md'), cm.sp('mb', this.showAction() ? 6 : 0))
  }

  /**
   * The message to render: the selected view, or the general props.
   * @returns The title, description and action nodes.
   */
  content(): { title?: unknown; description?: unknown; action?: unknown } {
    return this.view ?? { title: this.title, description: this.description, action: this.action }
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
   * Whether the icon badge renders.
   * @returns True when an icon text/template input or a projected icon is present.
   */
  showIcon(): boolean {
    return textOf(this.icon) !== null || this.templateOf(this.icon) !== null || this.iconProjected()
  }

  /**
   * Whether the description paragraph renders.
   * @returns True when a description content node or a projected description is present.
   */
  showDescription(): boolean {
    return this.content().description != null || this.descriptionProjected()
  }

  /**
   * Whether the action renders (React's truthiness check on `content.action`).
   * @returns True when an action content node or a projected action is present.
   */
  showAction(): boolean {
    return this.content().action != null || this.actionProjected()
  }

  /**
   * Reads the projected capture points and reconciles the optional wrappers.
   */
  reconcile(): void {
    const icon = this.iconEl?.nativeElement
    if (icon) this.iconProjected.set(hasNodes(icon))
    const description = this.descriptionEl?.nativeElement
    if (description) this.descriptionProjected.set(hasNodes(description))
    const action = this.actionEl?.nativeElement
    if (action) this.actionProjected.set(hasNodes(action))
    this.guard.toggle(this.iconEl?.nativeElement, this.showIcon())
    this.guard.toggle(this.descriptionEl?.nativeElement, this.showDescription())
  }

  /** Reconciles the wrappers once the view (and its projections) exist. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /** Reconciles the wrappers after input writes, as React re-renders on a prop change. */
  ngDoCheck(): void {
    this.reconcile()
  }
}
