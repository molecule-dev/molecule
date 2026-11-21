/**
 * NotificationCenter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type ElementRef,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button } from '@molecule/app-ui-angular'

import type { NotificationItem } from './types.js'

/** The panel's fixed inline style (React's `minWidth: 320, maxHeight: 480, overflowY: 'auto'`). */
const PANEL_STYLE = 'min-width: 320px; max-height: 480px; overflow-y: auto;'
/** The unread dot's inline style (width/height/marginTop only — the colour is a ClassMap class). */
const DOT_STYLE = 'width: 8px; height: 8px; margin-top: 6px;'

/**
 * Whether an `<ng-content>` wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) return true
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Whether a node-valued prop is an Angular template (a projected node) rather
 * than plain text. Checked structurally — `TemplateRef` is a type-only import
 * in the emitted metadata, so `instanceof` is not dependable across bundles.
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
 * @returns The text to render, or `''` when there is nothing.
 */
const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Standalone notification panel — title + mark-all-read action + scrollable
 * item list + footer "View all". Drop inside a popover / dropdown / drawer to
 * make a full notification center.
 *
 * The host IS the root `<div>` (`div[mol-notification-center]`), matching
 * React's root exactly: its classes, fixed inline style and `data-mol-id` live
 * on it. Node props are projected content (`[slot=title]`,
 * `[slot=emptyState]`) or a template reference passed as an input; React
 * renders whichever node it was given bare, so the capture points carry
 * `data-parity-unwrap` and the default text is dropped when content lands.
 *
 * @remarks
 * The item's `onClick` receives the click event, as React's DOM handler does.
 * Every visible string comes from `useTranslation()`, read reactively so a
 * locale switch refreshes it.
 */
@Component({
  selector: 'div[mol-notification-center]',
  standalone: true,
  imports: [NgTemplateOutlet, Alert, Button],
  inputs: [
    'items',
    'onMarkAllRead',
    'onViewAll',
    'emptyState',
    'title',
    'className',
    'lastError',
    'onRetry',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
  },
  // prettier-ignore
  template: `<header [class]="headerClasses()">
  <h3 [class]="titleClasses()">
    @if (titleTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}
    @else if (hasTitleText()) {<ng-container>{{ textOf(title) }}</ng-container>}
    @else {<span #titleFallback data-parity-unwrap>{{ defaultTitle() }}</span><span #titleSlot data-parity-unwrap style="display: contents"><ng-content select="[slot=title]"></ng-content></span>}
  </h3>
  @if (onMarkAllRead && hasItems()) {
    <button mol-button [variant]="'ghost'" [size]="'sm'" (click)="call(onMarkAllRead, $event)">{{ markAllLabel() }}</button>
  }
</header>
@if (lastError) {
  <div [class]="cm().sp('px', 3)">
    <div mol-alert [status]="'error'">
      <div [class]="cm().flex({ align: 'center', justify: 'between', gap: 'sm' })">
        <span [class]="cm().textSize('sm')">{{ loadErrorLabel() }}</span>
        <button mol-button [variant]="'ghost'" [size]="'sm'" data-mol-id="notification-center-retry" (click)="call(onRetry, $event)">{{ retryLabel() }}</button>
      </div>
    </div>
  </div>
}
@if (!hasItems()) {
  @if (emptyTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}
  @else {<div #emptyDefault [class]="emptyClasses()">{{ emptyLabel() }}</div><span #emptySlot data-parity-unwrap style="display: contents"><ng-content select="[slot=emptyState]"></ng-content></span>}
} @else {
  <ul [class]="cm().stack(0)">
    @for (it of items; track it.id) {
      <li>
        <div (click)="itemClick(it, $event)" (keydown)="itemKeyDown(it, $event)" [attr.role]="it.onClick ? 'button' : null" [attr.tabindex]="it.onClick ? 0 : null" [class]="itemClasses(it)">
          @if (it.leading) {<div [class]="cm().shrink0">@if (isNode(it.leading)) {<ng-container [ngTemplateOutlet]="templateOf(it.leading)" />} @else {<ng-container>{{ textOf(it.leading) }}</ng-container>}</div>}
          <div [class]="cm().cn(cm().flex1, cm().stack(0))">
            @if (!it.read) {<span [class]="cm().cn(cm().srOnly)">{{ unreadLabel() }}</span>}
            <span [class]="itemTitleClasses(it)">@if (isNode(it.title)) {<ng-container [ngTemplateOutlet]="templateOf(it.title)" />} @else {<ng-container>{{ textOf(it.title) }}</ng-container>}</span>
            @if (it.body) {<span [class]="cm().textSize('xs')">@if (isNode(it.body)) {<ng-container [ngTemplateOutlet]="templateOf(it.body)" />} @else {<ng-container>{{ textOf(it.body) }}</ng-container>}</span>}
            @if (it.timestamp) {<span [class]="cm().textSize('xs')">@if (isNode(it.timestamp)) {<ng-container [ngTemplateOutlet]="templateOf(it.timestamp)" />} @else {<ng-container>{{ textOf(it.timestamp) }}</ng-container>}</span>}
          </div>
          @if (!it.read) {<span aria-hidden="true" [class]="dotClasses()" [style]="dotStyle()"></span>}
        </div>
      </li>
    }
  </ul>
}
@if (onViewAll && hasItems()) {
  <footer [class]="footerClasses()"><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="call(onViewAll, $event)">{{ viewAllLabel() }}</button></footer>
}`,
})
export class NotificationCenter implements AfterViewInit, AfterViewChecked {
  /** Items to render. */
  items: NotificationItem[] = []
  /** Called when "Mark all as read" is clicked. */
  onMarkAllRead?: () => void
  /** Called when "View all" is clicked. */
  onViewAll?: () => void
  /** Empty-state node — a template reference or `[slot=emptyState]` content. */
  emptyState?: unknown
  /** Title — a template reference or `[slot=title]` content. */
  title?: unknown
  /** Extra classes on the panel wrapper. */
  className?: string
  /** The error from the most recent failed fetch. */
  lastError?: Error
  /** Called when the retry button is clicked. */
  onRetry?: () => void

  /** The title's default-text capture point. */
  @ViewChild('titleFallback') private titleFallback?: ElementRef<HTMLElement>
  /** The title's projected-node capture point. */
  @ViewChild('titleSlot') private titleSlot?: ElementRef<HTMLElement>
  /** The empty state's default panel. */
  @ViewChild('emptyDefault') private emptyDefault?: ElementRef<HTMLElement>
  /** The empty state's projected-node capture point. */
  @ViewChild('emptySlot') private emptySlot?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (React's `cm.cn(cm.stack(0), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(0), this.className)
  }

  /**
   * The host's inline style (React's fixed panel style).
   * @returns The style attribute text.
   */
  hostStyle(): string {
    return PANEL_STYLE
  }

  /**
   * The header's class list (React's flex row + `cm.sp('p', 3)`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
      this.cm().sp('p', 3),
    )
  }

  /**
   * The title heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The default empty panel's class list.
   * @returns The class string.
   */
  emptyClasses(): string {
    return this.cm().cn(this.cm().sp('p', 6), this.cm().textCenter, this.cm().textSize('sm'))
  }

  /**
   * The footer's class list.
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().cn(this.cm().sp('p', 2), this.cm().textCenter)
  }

  /**
   * One item row's class list (the unread row's tint follows the read state).
   *
   * @param it - The item.
   * @returns The class string.
   */
  itemClasses(it: NotificationItem): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'start', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      it.onClick ? cm.cursorPointer : undefined,
      it.read ? undefined : cm.bgPrimarySubtle,
    )
  }

  /**
   * One item title's class list (weight follows the read state).
   *
   * @param it - The item.
   * @returns The class string.
   */
  itemTitleClasses(it: NotificationItem): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      it.read ? this.cm().fontWeight('medium') : this.cm().fontWeight('semibold'),
    )
  }

  /**
   * The unread dot's class list (the theme's primary, fully rounded).
   * @returns The class string.
   */
  dotClasses(): string {
    return this.cm().cn(this.cm().bgPrimary, this.cm().roundedFull)
  }

  /**
   * The unread dot's inline style.
   * @returns The style attribute text.
   */
  dotStyle(): string {
    return DOT_STYLE
  }

  /**
   * Whether the list branch renders (React's `items.length > 0`).
   * @returns True when there is at least one item.
   */
  hasItems(): boolean {
    return (this.items?.length ?? 0) > 0
  }

  /**
   * The title as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.title) ? this.title : null
  }

  /**
   * Whether the title input itself carries text (React's `{title}` for a string child).
   * @returns True for a string or number title.
   */
  hasTitleText(): boolean {
    return typeof this.title === 'string' || typeof this.title === 'number'
  }

  /**
   * The empty state as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.emptyState) ? this.emptyState : null
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The field value.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A field value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return isTemplate(value) ? value : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The field value.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /**
   * The translated default title.
   * @returns The text.
   */
  defaultTitle(): string {
    return this.i18n.t('notifications.title', {}, { defaultValue: 'Notifications' })
  }

  /**
   * The translated mark-all-read label.
   * @returns The text.
   */
  markAllLabel(): string {
    return this.i18n.t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' })
  }

  /**
   * The translated load-error message.
   * @returns The text.
   */
  loadErrorLabel(): string {
    return this.i18n.t(
      'notifications.loadError',
      {},
      {
        defaultValue: 'Could not load notifications.',
      },
    )
  }

  /**
   * The translated retry label.
   * @returns The text.
   */
  retryLabel(): string {
    return this.i18n.t('notifications.retry', {}, { defaultValue: 'Retry' })
  }

  /**
   * The translated empty message.
   * @returns The text.
   */
  emptyLabel(): string {
    return this.i18n.t('notifications.empty', {}, { defaultValue: 'No notifications' })
  }

  /**
   * The translated "Unread" announcement (the sr-only label before the title).
   * @returns The text.
   */
  unreadLabel(): string {
    return this.i18n.t('notifications.unread', {}, { defaultValue: 'Unread' })
  }

  /**
   * The translated "View all" label.
   * @returns The text.
   */
  viewAllLabel(): string {
    return this.i18n.t('notifications.viewAll', {}, { defaultValue: 'View all' })
  }

  /**
   * Calls a callback with the click event, as React's DOM handler does.
   *
   * @param fn - The callback prop, when it was given.
   * @param event - The native click event.
   */
  call(fn: (() => void) | undefined, event: MouseEvent): void {
    ;(fn as ((event?: MouseEvent) => void) | undefined)?.(event)
  }

  /**
   * Calls an item's own click handler with the event.
   *
   * @param it - The item.
   * @param event - The native click event.
   */
  itemClick(it: NotificationItem, event: MouseEvent): void {
    ;(it.onClick as ((event?: MouseEvent) => void) | undefined)?.(event)
  }

  /**
   * Activates a clickable item row on Enter / Space (React's `onKeyDown`):
   * preventDefault, then the click handler with no event. A row without a
   * handler ignores every key, as it is not a button.
   *
   * @param it - The item.
   * @param event - The native keydown event.
   */
  itemKeyDown(it: NotificationItem, event: KeyboardEvent): void {
    const onClick = it.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  /**
   * Drops the default text/panel whichever capture point React would not render:
   * a projected node replaces the default, and the empty wrapper is transparent.
   */
  private syncSlots(): void {
    const titleSlot = this.titleSlot?.nativeElement
    if (titleSlot && hasNodes(titleSlot)) this.titleFallback?.nativeElement.remove()
    const emptySlot = this.emptySlot?.nativeElement
    if (emptySlot && hasNodes(emptySlot)) this.emptyDefault?.nativeElement.remove()
  }

  /** Reconciles the node-prop capture points once the view exists. */
  ngAfterViewInit(): void {
    this.syncSlots()
  }

  /** Re-reconciles after every check, as a props step can reveal a capture point. */
  ngAfterViewChecked(): void {
    this.syncSlots()
  }
}
