/**
 * MessagePreview component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, type TemplateRef } from '@angular/core'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate } from '@molecule/app-ui-angular'

import type { MessagePreviewPresence } from './types.js'

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
 * Derives up to two uppercase initials from a string ReactNode (React's
 * `deriveInitials`).
 *
 * @param value - The name prop.
 * @returns The initials, or the empty string when the name is not a string.
 */
const deriveInitials = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * MessagePreview component.
 *
 * Conversation / thread row — initials avatar with presence dot, name + preview
 * + timestamp + unread pip, and the active-selection treatment. React's root is
 * a `<div>` (or an `<a>` when `to` is set), so the rendered root stands in front
 * of the host's place and the host itself leaves the page (`placeContentBefore`
 * + `setElementPresent`). With `onClick` the div branch is a focusable button in
 * the a11y tree (`role="button"`, `tabindex="0"`) and Enter / Space activate it,
 * matching native button keyboard semantics. Node props are projected content
 * (`[slot=name]`, `[slot=preview]`, `[slot=timestamp]`) or `TemplateRef`s; a
 * plain string or number renders as text.
 *
 * The div branch comes first in the template because Angular projects a node
 * into the first matching `<ng-content>`; the link form always receives its
 * content as a `TemplateRef` or a plain string (an `<a>` cannot take projected
 * content here without duplicating the projection slot).
 *
 * The link form is the binding's `Link` (`<a molLink>`), react-router's
 * `<Link to>` contract: a plain primary click navigates in-app and prevents the
 * page load, a modified click is the browser's.
 */
@Component({
  selector: 'mol-message-preview',
  standalone: true,
  imports: [Link, NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: [
    'name',
    'preview',
    'timestamp',
    'unread',
    'presence',
    'active',
    'channelIcon',
    'initials',
    'to',
    'onClick',
    'unreadAriaLabel',
    'className',
  ],
  // The template's whitespace is semantic: the avatar and row containers are
  // flex, so a line break between their children never draws a space, and the
  // preview paragraph's text stays glued.
  // prettier-ignore
  template: `@if (!to) {<div [class]="wrapperClass()" [attr.role]="onClick ? 'button' : null" [attr.tabindex]="onClick ? 0 : null" (click)="handleClick($event)" (keydown)="handleKeyDown($event)"><div [class]="cm().messagePreviewAvatarWrap"><div [class]="avatarClasses()">{{ initialsLabel() }}</div>@if (presence) {<span aria-hidden="true" [class]="presenceClasses()"></span>}</div><div [class]="textColumnClasses()"><div [class]="nameRowClasses()"><span [class]="nameClasses()">{{ textOf(name) }}<ng-content select="[slot=name]"></ng-content>@if (nameTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span><span [class]="timestampClasses()">{{ textOf(timestamp) }}<ng-content select="[slot=timestamp]"></ng-content>@if (timestampTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span></div><div [class]="previewRowClasses()">@if (channelIcon) {<span [class]="channelIconClasses()" [style.font-size]="'14px'" aria-hidden="true">{{ channelIcon }}</span>}<p [class]="previewClasses()">{{ textOf(preview) }}<ng-content select="[slot=preview]"></ng-content>@if (previewTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</p>@if (unreadValue() > 0) {<span [attr.aria-label]="unreadLabel()" [class]="unreadClasses()">{{ unreadValue() }}</span>}</div></div></div>} @else {<a [molLink]="to" [class]="wrapperClass()" (click)="handleClick($event)"><div [class]="cm().messagePreviewAvatarWrap"><div [class]="avatarClasses()">{{ initialsLabel() }}</div>@if (presence) {<span aria-hidden="true" [class]="presenceClasses()"></span>}</div><div [class]="textColumnClasses()"><div [class]="nameRowClasses()"><span [class]="nameClasses()">{{ textOf(name) }}@if (nameTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span><span [class]="timestampClasses()">{{ textOf(timestamp) }}@if (timestampTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</span></div><div [class]="previewRowClasses()">@if (channelIcon) {<span [class]="channelIconClasses()" [style.font-size]="'14px'" aria-hidden="true">{{ channelIcon }}</span>}<p [class]="previewClasses()">{{ textOf(preview) }}@if (previewTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}</p>@if (unreadValue() > 0) {<span [attr.aria-label]="unreadLabel()" [class]="unreadClasses()">{{ unreadValue() }}</span>}</div></div></a>}`,
})
export class MessagePreview {
  /** Contact display name (`[slot=name]` projection, a `TemplateRef`, or a string). */
  name?: unknown
  /** Last-message preview line (`[slot=preview]` projection, a `TemplateRef`, or a string). */
  preview?: unknown
  /** Display timestamp (`[slot=timestamp]` projection, a `TemplateRef`, or a string). */
  timestamp?: unknown
  /** Unread count (React's default: 0). */
  unread?: number
  /** Presence state of the avatar dot; `null`/absent hides the dot. */
  presence?: MessagePreviewPresence | null
  /** Apply the active-selection treatment (React's default: false). */
  active?: boolean
  /** Material-symbols icon name shown ahead of the preview. */
  channelIcon?: string
  /** Override the initials computed from `name`. */
  initials?: string
  /** Optional href; when set, the row renders as a router link. */
  to?: string
  /**
   * Click handler, called with the native click event (React's `onClick`); also
   * fired with no event on Enter / Space.
   */
  onClick?: (event?: Event) => void
  /** Accessible label for the unread pip. */
  unreadAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the row `<div>` (or `<a>`) itself: it renders in front of the host's
    // place and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
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
   * The row's text for a node-valued prop (React renders a string or number directly).
   * @param value - The prop value.
   * @returns The text, or the empty string.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /**
   * The unread count (React's `unread = 0` default parameter).
   * @returns The count.
   */
  unreadValue(): number {
    return this.unread ?? 0
  }

  /**
   * The initials shown in the avatar (React's `initials ?? deriveInitials(name)`).
   * @returns The initials.
   */
  initialsLabel(): string {
    return this.initials ?? deriveInitials(this.name)
  }

  /**
   * The unread pip's accessible label (React's `unreadAriaLabel ?? "<N> unread"`).
   * @returns The label.
   */
  unreadLabel(): string {
    return this.unreadAriaLabel ?? `${this.unreadValue()} unread`
  }

  /**
   * The outer wrapper's class list (`cm.cn(cm.flex(…), cm.sp(…), row, active|hover, className)`).
   * @returns The class string.
   */
  wrapperClass(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ gap: 3, align: 'center' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.messagePreviewRow,
      this.active ? cm.messagePreviewRowActive : cm.messagePreviewRowHover,
      this.className,
    )
  }

  /**
   * The avatar box's class list.
   * @returns The class string.
   */
  avatarClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.w(9),
      cm.h(9),
      cm.roundedFull,
      cm.fontWeight('bold'),
      cm.textSize('xs'),
      cm.messagePreviewAvatar,
    )
  }

  /**
   * The presence dot's class list (online / away / offline fill).
   * @returns The class string.
   */
  presenceClasses(): string {
    const cm = this.cm()
    const fill =
      this.presence === 'online'
        ? cm.messagePreviewPresenceOnline
        : this.presence === 'away'
          ? cm.messagePreviewPresenceAway
          : cm.messagePreviewPresenceOffline
    return cm.cn(cm.messagePreviewPresenceDot, cm.w(2), cm.h(2), cm.roundedFull, fill)
  }

  /**
   * The text column's class list.
   * @returns The class string.
   */
  textColumnClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, cm.minW(0))
  }

  /**
   * The name/timestamp row's class list.
   * @returns The class string.
   */
  nameRowClasses(): string {
    return this.cm().cn(this.cm().flex({ justify: 'between', align: 'center', gap: 2 }))
  }

  /**
   * The name span's class list (bold while unread).
   * @returns The class string.
   */
  nameClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('sm'),
      cm.fontWeight(this.unreadValue() > 0 ? 'bold' : 'semibold'),
      cm.messagePreviewName,
    )
  }

  /**
   * The timestamp span's class list.
   * @returns The class string.
   */
  timestampClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.messagePreviewTimestamp)
  }

  /**
   * The preview row's class list.
   * @returns The class string.
   */
  previewRowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 2 }))
  }

  /**
   * The channel icon's class list.
   * @returns The class string.
   */
  channelIconClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.iconGlyphFont, cm.messagePreviewChannelIcon)
  }

  /**
   * The preview paragraph's class list.
   * @returns The class string.
   */
  previewClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.messagePreviewText)
  }

  /**
   * The unread pip's class list.
   * @returns The class string.
   */
  unreadClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.fontWeight('bold'),
      cm.roundedFull,
      cm.messagePreviewUnreadPip,
    )
  }

  /**
   * The `name` prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  nameTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.name)
  }

  /**
   * The `preview` prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  previewTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.preview)
  }

  /**
   * The `timestamp` prop as a `TemplateRef`, when a parent passed a node.
   * @returns The template, or null.
   */
  timestampTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.timestamp)
  }

  /**
   * Forwards the row click to `onClick` with the native event, as React's DOM
   * handler does.
   * @param event - The native click event.
   */
  handleClick(event: Event): void {
    this.onClick?.(event)
  }

  /**
   * Activates the row on Enter / Space (React's `handleKeyDown`):
   * preventDefault, then the click handler with no event.
   * @param event - The keydown.
   */
  handleKeyDown(event: KeyboardEvent): void {
    const onClick = this.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
}
