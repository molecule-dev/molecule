/**
 * ContactDisplay component (React parity).
 *
 * @module
 */

import {
  Component,
  Directive,
  ElementRef,
  type EmbeddedViewRef,
  inject,
  Input,
  type TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, Avatar } from '@molecule/app-ui-angular'

import type { ContactFields } from './types.js'

/**
 * Next value of the module-wide contact-name id counter.
 *
 * React derives the contact-name span's id from `useId()`, which numbers ids
 * from one process-wide counter; the open button's `aria-labelledby` names the
 * span by it, so the port generates ids from the same kind of counter — unique
 * per instance.
 */
let nextNameId = 0

/**
 * The text of a node-valued field (React renders a string, or a number, as
 * text; a node renders through {@link ContactNodeOutlet} instead).
 *
 * @param value - The field value.
 * @returns The text, or the empty string for a node or an absent value.
 */
function fieldText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * Renders a `TemplateRef` where the host `<ng-container>` sits.
 *
 * A node-valued field inside a data prop (`contact.role`) is a `TemplateRef`
 * rather than projected content, so the component instantiates it here. Angular
 * 22's own `NgTemplateOutlet` lives in `@angular/common`; this directive
 * re-instantiates the view when the template changes and needs nothing else.
 *
 * Not exported: it is this package's internal rendering detail, and the
 * package's public surface is exactly React's.
 */
@Directive({
  selector: '[molContactNode]',
  standalone: true,
})
class ContactNodeOutlet {
  private readonly vcr = inject(ViewContainerRef)
  private current: TemplateRef<unknown> | null = null
  private view?: EmbeddedViewRef<unknown>

  /**
   * The template to render (React's node value in template form).
   *
   * @param template - The template, or null/undefined to render nothing.
   */
  @Input() set molContactNode(template: TemplateRef<unknown> | null | undefined) {
    if (template === this.current) return
    this.current = template ?? null
    this.view?.destroy()
    this.view = undefined
    if (this.current) this.view = this.vcr.createEmbeddedView(this.current, {})
  }

  /**
   * The template currently rendered.
   * @returns The template, or null.
   */
  get molContactNode(): TemplateRef<unknown> | null {
    return this.current
  }
}

/**
 * ContactDisplay component.
 *
 * Formatted contact display — avatar + name + role + email/phone with leading
 * glyphs + optional address and company. Three layouts for different
 * densities. The host IS the root `<div>` (`div[mol-contact-display]`),
 * matching React's root exactly. With `onClick` a transparent native button
 * covering the whole row is its first child (a click anywhere on it, Enter or
 * Space activates the contact) and is named by the contact-name span; the
 * mail/tel links and the `actions` slot sit above it and keep their own
 * clicks. The optional right-side actions are projected (`[slot=actions]`);
 * the node-valued `contact.role`, `contact.address` and `contact.company`
 * arrive as `TemplateRef`s and render through {@link ContactNodeOutlet}, or as
 * text. Same props, same DOM as `@molecule/app-contact-display-react`'s
 * `ContactDisplay`.
 */
@Component({
  selector: 'div[mol-contact-display]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Avatar, ContactNodeOutlet],
  inputs: ['contact', 'layout', 'onClick', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (hasOnClick()) {<button type="button" [attr.aria-labelledby]="nameId" data-mol-id="contact-display-open" (click)="handleClick()" [class]="openButtonClass()" [style.background]="'transparent'" [style.border]="'none'" [style.padding]="'0'"></button>}<div [class]="avatarWrapClass()"><div mol-avatar [src]="avatarSrc()" [alt]="contactName()" [name]="contactName()" [size]="avatarSize()"></div></div>
    <div [class]="detailWrapClass()">
      <div [class]="nameRowClass()"><span [attr.id]="hasOnClick() ? nameId : null" [class]="nameClass()">{{ contactName() }}</span>@if (hasRole()) {<span [class]="roleClass()">{{ roleText }}<ng-container [molContactNode]="roleTemplate()"></ng-container></span>}</div>
      @if (hasCompany()) {<div [class]="companyClass()">{{ companyText }}<ng-container [molContactNode]="companyTemplate()"></ng-container></div>}
      @if (showEmail()) {<div [class]="hasOnClick() ? raisedDetailRowClass() : detailRowClass()"><span aria-hidden="true">✉</span><a [attr.href]="'mailto:' + contactEmail()" [class]="linkClass()">{{ contactEmail() }}</a></div>}
      @if (showPhone()) {<div [class]="hasOnClick() ? raisedDetailRowClass() : detailRowClass()"><span aria-hidden="true">☎</span><a [attr.href]="'tel:' + contactPhone()" [class]="linkClass()">{{ contactPhone() }}</a></div>}
      @if (showAddress()) {<div [class]="detailRowClass()"><span aria-hidden="true">⌂</span><span>{{ addressText }}<ng-container [molContactNode]="addressTemplate()"></ng-container></span></div>}
    </div><div #actionsWrap [class]="actionsWrapClass()"><ng-content select="[slot=actions]"></ng-content></div>`,
})
export class ContactDisplay {
  /** The contact to display. */
  contact?: ContactFields
  /** Layout preset. Defaults to `'card'` at read time. */
  layout?: 'card' | 'row' | 'compact'
  /**
   * Activates the contact: the whole row becomes clickable through a
   * transparent native button covering it, named by the contact name (the
   * name span), so Enter and Space activate it natively. The row's inner
   * controls — the mail/tel links and the `actions` slot — sit above that
   * button and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The actions slot's always-mounted wrapper (projection needs the capture point). */
  @ViewChild('actionsWrap') private actionsWrapRef?: ElementRef<HTMLDivElement>

  /** The host element (the root `<div>`), the actions' bare parent. */
  private readonly host = inject(ElementRef)

  /**
   * The contact-name span's id, which the open button's `aria-labelledby`
   * names (React derives it from `useId()`; a per-instance counter gives each
   * instance its own).
   */
  readonly nameId = `contact-display-name-${nextNameId++}`

  constructor() {
    usePlacement((hasContent) => this.syncActionsSlot(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The active layout (React's `layout = 'card'` default).
   * @returns The layout.
   */
  activeLayout(): 'card' | 'row' | 'compact' {
    return this.layout ?? 'card'
  }

  /**
   * Whether the compact layout hides the contact details.
   * @returns True for `layout: 'compact'`.
   */
  isCompact(): boolean {
    return this.activeLayout() === 'compact'
  }

  /**
   * The contact's display name.
   * @returns The name, or the empty string.
   */
  contactName(): string {
    return fieldText(this.contact?.name)
  }

  /**
   * The contact's email address.
   * @returns The email, or the empty string.
   */
  contactEmail(): string {
    return fieldText(this.contact?.email)
  }

  /**
   * The contact's phone number.
   * @returns The phone, or the empty string.
   */
  contactPhone(): string {
    return fieldText(this.contact?.phone)
  }

  /**
   * The avatar image URL, when the contact has one.
   * @returns The URL, or undefined.
   */
  avatarSrc(): string | undefined {
    return this.contact?.avatarSrc
  }

  /**
   * The avatar size preset for the layout.
   * @returns `'sm'` in the compact layout, else `'md'`.
   */
  avatarSize(): 'sm' | 'md' {
    return this.isCompact() ? 'sm' : 'md'
  }

  /**
   * Whether the role renders (React's `role && …` truthiness).
   * @returns True for a node or non-empty text.
   */
  hasRole(): boolean {
    return Boolean(this.contact?.role)
  }

  /**
   * Whether the company renders.
   * @returns True for a node or non-empty text.
   */
  hasCompany(): boolean {
    return Boolean(this.contact?.company)
  }

  /**
   * Whether the email line renders (React's `!isCompact && email`).
   * @returns True when the email shows.
   */
  showEmail(): boolean {
    return !this.isCompact() && Boolean(this.contactEmail())
  }

  /**
   * Whether the phone line renders.
   * @returns True when the phone shows.
   */
  showPhone(): boolean {
    return !this.isCompact() && Boolean(this.contactPhone())
  }

  /**
   * Whether the address line renders.
   * @returns True when the address shows.
   */
  showAddress(): boolean {
    return !this.isCompact() && Boolean(this.contact?.address)
  }

  /**
   * The role as a template, when the caller passed a node.
   * @returns The template, or null for text or an absent role.
   */
  roleTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.contact?.role)
  }

  /**
   * The role's text (React renders a string role as text).
   * @returns The text, or the empty string for a node or an absent role.
   */
  get roleText(): string {
    return fieldText(this.contact?.role)
  }

  /**
   * The company as a template, when the caller passed a node.
   * @returns The template, or null for text or an absent company.
   */
  companyTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.contact?.company)
  }

  /**
   * The company's text.
   * @returns The text, or the empty string for a node or an absent company.
   */
  get companyText(): string {
    return fieldText(this.contact?.company)
  }

  /**
   * The address as a template, when the caller passed a node.
   * @returns The template, or null for text or an absent address.
   */
  addressTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.contact?.address)
  }

  /**
   * The address's text.
   * @returns The text, or the empty string for a node or an absent address.
   */
  get addressText(): string {
    return fieldText(this.contact?.address)
  }

  /**
   * Computes the root class list (`cm.flex(…)` + `className`; with `onClick`,
   * `cm.position('relative')`, so the open button inside covers the row).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({
        align: this.activeLayout() === 'card' ? 'start' : 'center',
        gap: this.isCompact() ? 'sm' : 'md',
        direction: this.activeLayout() === 'card' ? 'col' : 'row',
      }),
      this.hasOnClick() ? this.cm().position('relative') : undefined,
      this.className,
    )
  }

  /**
   * Whether the open button renders (React's `onClick ? …`).
   * @returns True when an `onClick` handler is set.
   */
  hasOnClick(): boolean {
    return Boolean(this.onClick)
  }

  /**
   * The avatar wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  avatarWrapClass(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The avatar column's class (`cm.flex1` + `cm.stack(1)`).
   * @returns The class string.
   */
  detailWrapClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The name line's class (`cm.flex({ align: 'baseline', gap: 'sm' })`).
   * @returns The class string.
   */
  nameRowClass(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The name span's class (size by layout + semibold).
   * @returns The class string.
   */
  nameClass(): string {
    return this.cm().cn(
      this.cm().textSize(this.isCompact() ? 'sm' : 'base'),
      this.cm().fontWeight('semibold'),
    )
  }

  /**
   * The role span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  roleClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The company line's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  companyClass(): string {
    return this.cm().textSize('sm')
  }

  /**
   * One detail line's class (`cm.flex({ align: 'center', gap: 'xs' })` +
   * `cm.textSize('sm')`).
   * @returns The class string.
   */
  detailRowClass(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.cm().textSize('sm'))
  }

  /**
   * A control detail line's class (the detail line's class plus
   * `cm.position('relative')`, so the mail/tel link paints above the open
   * button and keeps its own clicks).
   * @returns The class string.
   */
  raisedDetailRowClass(): string {
    return this.cm().cn(this.detailRowClass(), this.cm().position('relative'))
  }

  /**
   * The mailto/tel link's class (`cm.link`).
   * @returns The class string.
   */
  linkClass(): string {
    return this.cm().cn(this.cm().link)
  }

  /**
   * The open button's class (`cm.position('absolute')` + `cm.inset0` +
   * `cm.cursorPointer`).
   * @returns The class string.
   */
  openButtonClass(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The actions slot wrapper's class (`cm.position('relative')` with
   * `onClick`, so the projected controls paint above the open button and
   * keep their own clicks; empty while the wrapper sits detached).
   * @returns The class string.
   */
  actionsWrapClass(): string {
    return this.hasOnClick() ? this.cm().position('relative') : ''
  }

  /**
   * Applies the actions wrapper decision, idempotently: React renders
   * `onClick && actions` inside the `position: relative` wrapper and the
   * actions bare otherwise (or not at all, when there is nothing projected).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncActionsSlot(hasContent: SlotReader): void {
    const wrapper = this.actionsWrapRef?.nativeElement
    if (!wrapper) return
    if (this.hasOnClick() && hasContent(wrapper)) {
      setElementPresent(wrapper, true)
      placeContent(wrapper, null)
      return
    }
    // No wrapper for React's render (no `onClick`, or nothing projected): the
    // projected nodes render bare at the wrapper's place, and the empty
    // wrapper leaves the DOM.
    placeContent(wrapper, this.host.nativeElement, wrapper)
    setElementPresent(wrapper, false)
  }

  /**
   * Runs the click handler from the open button (a native button turns Enter
   * and Space into this click itself; no event is forwarded, the way React
   * calls `onClick()` with none).
   */
  handleClick(): void {
    this.onClick?.()
  }
}
