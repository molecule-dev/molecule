/**
 * InboxRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, Avatar } from '@molecule/app-ui-angular'

/**
 * Next value of the module-wide row-id counter.
 *
 * React derives the open button's two naming ids from `useId()`, which
 * numbers ids from one process-wide counter (`_r_<base32>_`). The ids appear
 * in `id` and `aria-labelledby`, which the conformance normalizer renumbers
 * in order of appearance, so the port generates ids from the same kind of
 * counter — unique per instance, exactly React's format.
 */
let nextRowId = 0

/**
 * A fresh row id, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id prefix for this instance's open button.
 */
const rowId = (): string => `_r_${(nextRowId++).toString(32)}_`

/**
 * The text React renders for a node-valued prop: a string or a number as text,
 * and nothing for a node (which renders through a template outlet instead).
 *
 * @param value - The prop value.
 * @returns The text, or the empty string.
 */
const textOf = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * InboxRow component.
 *
 * Inbox / email message list row — sender + subject + preview + timestamp +
 * unread/star indicators. The host IS the root `<div>` (`div[mol-inbox-row]`),
 * matching React's root exactly. Node-valued props are projected content
 * (`[slot=sender]`, `[slot=subject]`, …) or `TemplateRef`s; a plain string or
 * number renders as text. `labels`, `preview` and `timestamp` render their
 * wrapper only when React would: the wrapper always exists in the template as
 * the projection capture point and is detached while empty.
 *
 * While `onClick` is set the whole row is clickable through a transparent
 * native button laid over it (the row's open action, named by the sender and
 * the subject), and the row's other controls — the star toggle, the selection
 * slot, the labels slot — are raised into positioned wrappers so they paint
 * above it and keep their own clicks. The star's wrapper follows React's own
 * conditional (`onClick` chooses whether it renders at all); the selection
 * wrapper stays in the template so its projection has one home, and while
 * `onClick` is absent its content renders at the wrapper's place and the empty
 * span leaves the DOM, the way React renders the control bare.
 *
 * The structure and every style mirror
 * `@molecule/app-inbox-row-react`'s `InboxRow`; translated labels come from
 * `useTranslation()` (`inboxRow.*`), read reactively so a locale switch
 * refreshes them.
 */
@Component({
  selector: 'div[mol-inbox-row]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Avatar, NgTemplateOutlet],
  inputs: [
    'sender',
    'senderAvatarSrc',
    'subject',
    'preview',
    'timestamp',
    'unread',
    'starred',
    'hasAttachment',
    'labels',
    'selectionSlot',
    'onClick',
    'onToggleStar',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[style.font-weight]': 'unread ? 600 : null',
  },
  // The template's whitespace is semantic: the subject line is block-level, so
  // a line break between its inline children would draw a space React does not
  // render. Everything is glued, and the preview's `— ` prefix is an explicit
  // interpolation.
  // prettier-ignore
  template: `@if (onClick) {<button type="button" [attr.aria-labelledby]="openLabelledBy()" data-mol-id="inbox-row-open" (click)="handleClick()" [class]="openButtonClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.padding]="'0px'"></button>}<span #selectionWrap [class]="selectionClasses()"><ng-content select="[slot=selectionSlot]"></ng-content>@if (selectionTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span>@if (onToggleStar !== undefined) {@if (onClick) {<span [class]="starWrapClasses()"><button type="button" (click)="toggleStar($event)" [attr.aria-pressed]="starred ?? null" data-mol-id="inbox-row-star" [attr.aria-label]="starLabel()" [class]="starClasses()" [style.background]="'none'" [style.border]="'none'" [style.font-size]="'16px'">★</button></span>} @else {<button type="button" (click)="toggleStar($event)" [attr.aria-pressed]="starred ?? null" data-mol-id="inbox-row-star" [attr.aria-label]="starLabel()" [class]="starClasses()" [style.background]="'none'" [style.border]="'none'" [style.font-size]="'16px'">★</button>}}<div mol-avatar [src]="senderAvatarSrc" [alt]="senderName()" [name]="senderName()" [size]="'sm'"></div><div [class]="stackClasses()" [style.min-width]="'0px'"><div [class]="senderRowClasses()"><span [attr.id]="senderId()" [class]="cm().textSize('sm')">{{ senderText() }}<ng-content select="[slot=sender]"></ng-content>@if (senderTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span><span #labelsWrap [class]="labelsClasses()"><ng-content select="[slot=labels]"></ng-content>@if (labelsTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}{{ labelsText() }}</span></div><div [style.overflow]="'hidden'" [style.text-overflow]="'ellipsis'" [style.white-space]="'nowrap'"><span [attr.id]="subjectId()" [class]="cm().textSize('sm')">{{ subjectText() }}<ng-content select="[slot=subject]"></ng-content>@if (subjectTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span><span #previewWrap [class]="previewClasses()" [style.opacity]="'0.6'">{{ '— ' }}<ng-content select="[slot=preview]"></ng-content>@if (previewTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}{{ previewText() }}</span></div></div>@if (hasAttachment) {<span [attr.aria-label]="attachmentLabel()">📎</span>}@if (unread) {<span aria-hidden="true" [class]="cm().bgTone('info')" [style.width]="'8px'" [style.height]="'8px'" [style.border-radius]="'50%'"></span>}<span #timestampWrap [class]="timestampClasses()"><ng-content select="[slot=timestamp]"></ng-content>@if (timestampTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}{{ timestampText() }}</span>`,
})
export class InboxRow {
  /** Sender display (a `[slot=sender]` projection or a `TemplateRef`; a plain string names the avatar too). */
  sender?: unknown
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. */
  subject?: unknown
  /** Preview / first line of body. */
  preview?: unknown
  /** Display timestamp. */
  timestamp?: unknown
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row. */
  labels?: unknown
  /** Right-side selection slot (checkbox). */
  selectionSlot?: unknown
  /** Click handler, called with no arguments (React's `onClick`). */
  onClick?: () => void
  /** Star toggle (React's `onToggleStar`, takes no arguments). */
  onToggleStar?: () => void
  /** Extra classes. */
  className?: string

  /** This instance's row id (the open button's two naming ids' base). */
  private readonly rowId = rowId()

  /**
   * The labels wrapper (React renders it only when `labels` is truthy).
   */
  @ViewChild('labelsWrap') labelsWrap?: ElementRef<HTMLElement>
  /** The preview wrapper (React renders it only when `preview` is truthy). */
  @ViewChild('previewWrap') previewWrap?: ElementRef<HTMLElement>
  /** The timestamp wrapper (React renders it only when `timestamp` is truthy). */
  @ViewChild('timestampWrap') timestampWrap?: ElementRef<HTMLElement>
  /** The selection slot's positioned wrapper (React's raised control). */
  @ViewChild('selectionWrap') selectionWrap?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so a template that calls it re-renders the text on a locale switch
   * (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  /** The component host element (the root `<div>`), where the bare controls render. */
  private readonly host = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => this.syncWrappers(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer row's class list (React's `cm.cn(cm.flex(…), cm.sp('px', 3),
   * cm.sp('py', 2), className)` — plus `cm.position('relative')` while
   * `onClick` is set, the open button's positioning context).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.onClick ? this.cm().position('relative') : undefined,
      this.className,
    )
  }

  /**
   * The open button's class (React's
   * `cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)`).
   * @returns The class string.
   */
  openButtonClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The selection slot wrapper's class: `cm.position('relative')` while
   * `onClick` is set (the wrapper paints above the open button and keeps the
   * slot's clicks), nothing otherwise.
   * @returns The class string.
   */
  selectionClasses(): string {
    return this.cm().cn(this.onClick ? this.cm().position('relative') : undefined)
  }

  /**
   * The star wrapper's class: `cm.position('relative')` while `onClick` is
   * set (the wrapper paints above the open button and keeps the star's
   * clicks), nothing otherwise.
   * @returns The class string.
   */
  starWrapClasses(): string {
    return this.cm().cn(this.onClick ? this.cm().position('relative') : undefined)
  }

  /**
   * The star button's class list (`cm.cn(cm.cursorPointer, cm.touchTarget)`,
   * plus `cm.textTone('warning')` while starred and `cm.textMuted`
   * otherwise — the tone the React star's colour resolves to).
   * @returns The class string.
   */
  starClasses(): string {
    return this.cm().cn(
      this.cm().cursorPointer,
      this.cm().touchTarget,
      this.starred ? this.cm().textTone('warning') : this.cm().textMuted,
    )
  }

  /**
   * The text column's class list (`cm.cn(cm.flex1, cm.stack(0))`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * The sender row's class (`cm.flex({ align: 'baseline', gap: 'sm' })`).
   * @returns The class string.
   */
  senderRowClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The labels chip row's class (`cm.flex({ align: 'center', gap: 'xs' })`,
   * plus `cm.position('relative')` while `onClick` is set — the wrapper paints
   * above the open button and keeps the labels' clicks).
   * @returns The class string.
   */
  labelsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.onClick ? this.cm().position('relative') : undefined,
    )
  }

  /**
   * The preview span's class (`cm.cn(cm.textSize('sm'), cm.sp('ml', 2))`).
   * @returns The class string.
   */
  previewClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().sp('ml', 2))
  }

  /**
   * The timestamp span's class (`cm.cn(cm.textSize('xs'), cm.shrink0)`).
   * @returns The class string.
   */
  timestampClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().shrink0)
  }

  /**
   * The sender span's id (the first half of the open button's
   * `aria-labelledby`), while `onClick` is set.
   * @returns The id, or null (React renders no id without `onClick`).
   */
  senderId(): string | null {
    return this.onClick ? `${this.rowId}-sender` : null
  }

  /**
   * The subject span's id (the second half of the open button's
   * `aria-labelledby`), while `onClick` is set.
   * @returns The id, or null (React renders no id without `onClick`).
   */
  subjectId(): string | null {
    return this.onClick ? `${this.rowId}-subject` : null
  }

  /**
   * The open button's `aria-labelledby` (the sender and the subject ids),
   * while `onClick` is set.
   * @returns The id list, or null (React renders no button without `onClick`).
   */
  openLabelledBy(): string | null {
    return this.onClick ? `${this.rowId}-sender ${this.rowId}-subject` : null
  }

  /**
   * The avatar's accessible name (React's `senderName`): the string sender
   * itself, otherwise the translated `inboxRow.sender`.
   * @returns The name.
   */
  senderName(): string {
    return typeof this.sender === 'string'
      ? this.sender
      : this.i18n.t('inboxRow.sender', undefined, { defaultValue: 'Sender' })
  }

  /**
   * The star button's accessible label (React's `inboxRow.unstar` /
   * `inboxRow.star`).
   * @returns The label text.
   */
  starLabel(): string {
    return this.starred
      ? this.i18n.t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' })
      : this.i18n.t('inboxRow.star', undefined, { defaultValue: 'Star' })
  }

  /**
   * The attachment indicator's accessible label.
   * @returns The label text.
   */
  attachmentLabel(): string {
    return this.i18n.t('inboxRow.hasAttachment', undefined, { defaultValue: 'Has attachment' })
  }

  /**
   * The sender's text (React renders a string or number directly).
   * @returns The text, or the empty string.
   */
  senderText(): string {
    return textOf(this.sender)
  }

  /**
   * The subject's text.
   * @returns The text, or the empty string.
   */
  subjectText(): string {
    return textOf(this.subject)
  }

  /**
   * The preview's text.
   * @returns The text, or the empty string.
   */
  previewText(): string {
    return textOf(this.preview)
  }

  /**
   * The timestamp's text.
   * @returns The text, or the empty string.
   */
  timestampText(): string {
    return textOf(this.timestamp)
  }

  /**
   * The labels' text.
   * @returns The text, or the empty string.
   */
  labelsText(): string {
    return textOf(this.labels)
  }

  /**
   * The sender prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  senderTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.sender)
  }

  /**
   * The subject prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  subjectTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.subject)
  }

  /**
   * The preview prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  previewTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.preview)
  }

  /**
   * The timestamp prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  timestampTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.timestamp)
  }

  /**
   * The labels prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  labelsTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.labels)
  }

  /**
   * The selection slot prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  selectionTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.selectionSlot)
  }

  /**
   * Runs the open button's action, as React's `onClick` does (no arguments;
   * a native button turns Enter and Space into this click itself).
   */
  handleClick(): void {
    this.onClick?.()
  }

  /**
   * Activates the star toggle by calling `onToggleStar`. The star is raised
   * in its positioned wrapper above the row's open button, so its click
   * never reaches the open action — nothing to stop.
   * @param _event - The native click event.
   */
  toggleStar(_event: MouseEvent): void {
    this.onToggleStar?.()
  }

  /**
   * Whether React renders a conditional wrapper: a given truthy prop, or a
   * projected node while the prop is absent.
   * @param prop - The node-valued prop.
   * @param wrap - The wrapper element.
   * @param hasContent - Reads whether a slot has content.
   * @returns True when the wrapper belongs in the DOM.
   */
  private present(
    prop: unknown,
    wrap: ElementRef<HTMLElement> | undefined,
    hasContent: SlotReader,
  ): boolean {
    if (prop !== undefined) return Boolean(prop)
    return hasContent(wrap?.nativeElement)
  }

  /**
   * Whether React renders the preview span. React renders the span only with
   * the preview (`preview && <span>— {preview}</span>`); the span's own `— `
   * prefix is template text, not projected content, so the slot read skips
   * that one leading node.
   * @param hasContent - Reads whether a slot has content.
   * @returns True when the preview span has content.
   */
  private previewPresent(hasContent: SlotReader): boolean {
    if (this.preview !== undefined) return Boolean(this.preview)
    return hasContent(this.previewWrap?.nativeElement, 1)
  }

  /**
   * Whether React renders the selection slot at all: a given truthy prop, or
   * projected nodes. The reader reads the content where it renders, including
   * while it sits bare on the host.
   * @param hasContent - Reads whether a slot has content.
   * @returns True when the slot has content.
   */
  private selectionPresent(hasContent: SlotReader): boolean {
    if (this.selectionSlot !== undefined) return Boolean(this.selectionSlot)
    return hasContent(this.selectionWrap?.nativeElement)
  }

  /**
   * Wraps or unwraps one raised control: while `onClick` is set its wrapper
   * span (positioned, so it paints above the open button) stays in the DOM
   * around it; while it is not, the span's content renders at its place on the
   * host and the empty span leaves the DOM, the way React renders the control
   * bare.
   * @param el - The wrapper element.
   * @param raised - Whether `onClick` is set.
   */
  private syncRaised(el: Element | undefined, raised: boolean): void {
    if (!el) return
    if (raised) {
      setElementPresent(el, true)
      placeContent(el, null)
      return
    }
    placeContent(el, this.host.nativeElement, el)
    setElementPresent(el, false)
  }

  /**
   * Places the raised controls where React renders them, and attaches or
   * detaches the conditional wrappers, so the DOM matches what React renders
   * for the current props.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncWrappers(hasContent: SlotReader): void {
    this.syncRaised(
      this.selectionWrap?.nativeElement,
      Boolean(this.onClick) && this.selectionPresent(hasContent),
    )
    const labels = this.labelsWrap?.nativeElement
    if (labels) setElementPresent(labels, this.present(this.labels, this.labelsWrap, hasContent))
    const preview = this.previewWrap?.nativeElement
    if (preview) setElementPresent(preview, this.previewPresent(hasContent))
    const timestamp = this.timestampWrap?.nativeElement
    if (timestamp)
      setElementPresent(timestamp, this.present(this.timestamp, this.timestampWrap, hasContent))
  }
}
