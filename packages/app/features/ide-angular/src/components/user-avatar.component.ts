/**
 * Renders the signed-in user's profile avatar beside their own chat messages
 * (SOC1). When the host supplies a safe, renderable avatar it shows the real
 * image; otherwise it falls back to the generic `user` glyph from the bonded
 * icon set — so the column is always present and the layout never shifts.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `UserAvatar` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. React's root is a different element
 * per branch — the bare `<img>`/`<span>` without `onClick`, the accessible
 * `<button>` wrapper with it — so the host is a `display: contents` wrapper
 * (`div[mol-user-avatar]`), unwrapped by the conformance normalizer the same
 * way it unwraps the fragment-rooted components; a standalone component's host
 * tag cannot change at runtime. The visual itself stays in one `ng-template`
 * so both branches render the same markup. Styling uses `getClassMap()`
 * (`cm.*`); the only inline styles are the rounded-square crop and the one-off
 * primary tint the ClassMap can't express, serialized through `styleText` the
 * way React writes numbers (`24` → `24px`, `fontWeight: 600` stays unitless).
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { resolveUserAvatar } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from './icon.component.js'

/**
 * The tinted backdrop behind every avatar tile: a solid, VISIBLE primary mix
 * so a transparent PNG (or the pre-load gap) shows a real tile — a one-off
 * color-mix the ClassMap can't express, so it's inline.
 */
const TILE_BACKGROUND =
  'color-mix(in srgb, var(--mol-color-primary, #6366f1) 18%, var(--mol-color-surface, #f4f4f4))'

/**
 * Props for {@link UserAvatar} — the React prop names, React's own contract.
 */
export interface UserAvatarProps {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an `http(s)`
   * URL from their profile metadata. Unsafe / unset / oversized values are
   * ignored (see `resolveUserAvatar`) and the generic icon is shown.
   */
  userAvatar?: string | null
  /**
   * The message author's display name, for a TEAMMATE's message. When set and
   * there is no renderable avatar, the fallback tile shows the name's initial
   * instead of the generic `user` glyph. Also used as the accessible label /
   * image alt in place of the solo "You".
   */
  name?: string
  /** Diameter of the avatar in pixels. Defaults to 24. */
  size?: number
  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button that opens the user's profile; when omitted (the default) it
   * renders as a static, non-interactive image/icon.
   */
  onClick?: (event: Event) => void
}

/**
 * The avatar visual — the real image, or the tinted rounded-square tile with
 * the author's initial or the generic person glyph. React renders it bare
 * without `onClick` and inside the accessible button with it; the template
 * keeps it in one `ng-template` so both branches render the same markup.
 */
@Component({
  selector: 'div[mol-user-avatar]',
  standalone: true,
  imports: [NgTemplateOutlet, Icon],
  inputs: ['userAvatar', 'name', 'size', 'onClick'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (onClick) {<button type="button" (click)="onHostClick($event)" (mouseenter)="hover.set(true)" (mouseleave)="hover.set(false)" (focus)="hover.set(true)" (blur)="hover.set(false)" data-mol-id="chat-user-avatar-button" [attr.aria-label]="buttonLabel()" [class]="cm.touchTargetCompact" [attr.style]="buttonStyle()"><ng-container [ngTemplateOutlet]="visual"></ng-container></button>} @else {<ng-container [ngTemplateOutlet]="visual"></ng-container>}<ng-template #visual>@if (src() !== null) {<img [attr.src]="src()" [attr.alt]="label()" data-mol-id="chat-user-avatar" [attr.style]="imgStyle()" />} @else {<span [attr.role]="label() !== '' ? 'img' : null" [attr.aria-label]="label() !== '' ? label() : null" [attr.aria-hidden]="label() !== '' ? null : 'true'" data-mol-id="chat-user-avatar" [attr.style]="tileStyle()">@if (initial() !== '') {<span aria-hidden="true" [attr.style]="initialStyle()">{{ initial() }}</span>} @else {<svg mol-icon [name]="'user'" [size]="glyphSize()" aria-hidden="true"></svg>}</span>}</ng-template>`,
})
export class UserAvatar implements AfterViewInit, AfterViewChecked {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an `http(s)`
   * URL from their profile metadata. Unsafe / unset / oversized values are
   * ignored (see `resolveUserAvatar`) and the generic icon is shown.
   */
  userAvatar?: string | null

  /**
   * The message author's display name, for a TEAMMATE's message. When set and
   * there is no renderable avatar, the fallback tile shows the name's initial
   * instead of the generic `user` glyph. Also used as the accessible label /
   * image alt in place of the solo "You".
   */
  name?: string

  /** Diameter of the avatar in pixels. Defaults to 24. */
  size = 24

  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button that opens the user's profile; when omitted (the default) it
   * renders as a static, non-interactive image/icon. The DOM hands the click
   * event to the handler the same way React's `onClick` receives it; a
   * zero-argument handler (React's `() => void`) types fine here too.
   */
  onClick?: (event: Event) => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The hover/focus ring state (React's `useState(false)` + the four handlers). */
  protected readonly hover = signal(false)

  /** The host element (the `display: contents` wrapper). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Runs {@link restoreHost} when the view is destroyed. */
  private readonly destroyRef = inject(DestroyRef)

  /** The wrapped visual template (`#visual`), rendered by either branch. */
  @ViewChild('visual', { static: true }) protected visual!: TemplateRef<unknown>

  /**
   * Where the branch views render. React's root is a different element per
   * branch — the bare `<img>`/`<span>` without `onClick`, the accessible
   * `<button>` with it — and it sits where the HOST sits (there is no wrapper
   * around React's root). A standalone component's host tag cannot change at
   * runtime, so the rendered branch is ADOPTED beside the host, the way the
   * shared UI kit's sidebar user card adopts its popover trigger beside its
   * host: the branch element becomes the parent's child exactly where React
   * puts it. The branch swaps land inside the (now detached) host, so every
   * change-detection pass re-adopts any element that appeared there.
   */
  private adoptedParent: Node | null = null
  /** The node the adopted branch sits before (the host's old next sibling). */
  private adoptedBefore: Node | null = null

  /** Adopts the first branch render beside the host. */
  ngAfterViewInit(): void {
    this.adoptBranches()
    this.destroyRef.onDestroy(() => this.restoreHost())
  }

  /** Re-adopts branch views that a branch swap rendered into the detached host. */
  ngAfterViewChecked(): void {
    this.adoptBranches()
  }

  /**
   * Moves every element child of the host beside it, then takes the host out
   * of the tree — once, with the branch content kept in order.
   */
  private adoptBranches(): void {
    const el = this.host.nativeElement
    if (el.childElementCount === 0) return
    if (!this.adoptedParent) {
      this.adoptedParent = el.parentNode
      this.adoptedBefore = el.nextSibling
    }
    const parent = this.adoptedParent
    const before = this.adoptedBefore
    if (!parent) return
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) parent.insertBefore(child, before)
    }
    // The host itself stays out of the tree while its content is adopted;
    // {@link restoreHost} puts it back so Angular's teardown finds a
    // well-formed tree.
    el.remove()
  }

  /**
   * Puts the host back where it was and its content back inside it, so the
   * framework's view teardown removes a tree it still owns.
   */
  private restoreHost(): void {
    const el = this.host.nativeElement
    const parent = this.adoptedParent
    if (!parent) return
    // Every adopted element sits before the recorded anchor; gather them back
    // inside the host first, then put the host back in the parent.
    for (const child of Array.from(parent.childNodes)) {
      if (child === this.adoptedBefore) break
      if (child.nodeType === Node.ELEMENT_NODE) el.appendChild(child)
    }
    if (!el.isConnected) parent.insertBefore(el, this.adoptedBefore)
  }

  /**
   * The safe `<img>` src, or `null` when the fallback tile is due
   * (`resolveUserAvatar`, read per change-detection pass like React's render).
   * @returns The resolved src.
   */
  protected src(): string | null {
    return resolveUserAvatar(this.userAvatar)
  }

  /**
   * The avatar's accessible label: the author's raw name when we have one (a
   * teammate's message — untrimmed, only its initial is), else the solo "You"
   * (already translated) for the viewer's own messages, and '' for a
   * whitespace-only name (a blank author is no author to announce).
   * @returns The label text.
   */
  protected label(): string {
    // A whitespace-only (or empty) name is no name: it initials to nothing,
    // and the label drops to '' so the fallback tile renders decorative
    // (aria-hidden, no image role) instead of announcing a blank.
    const trimmed = this.name?.trim() ?? ''
    if (trimmed) return this.name!
    if (this.name == null) return this.t('ide.chat.you', undefined, { defaultValue: 'You' })
    return ''
  }

  /**
   * The fallback tile's initial letter (named author, no renderable avatar).
   * @returns The uppercase initial, or '' for an unnamed/blank author.
   */
  protected initial(): string {
    return this.name?.trim().charAt(0).toUpperCase() ?? ''
  }

  /**
   * The fallback glyph's size (React's `Math.round(size * 0.6)`).
   * @returns The pixel size.
   */
  protected glyphSize(): number {
    return Math.round(this.size * 0.6)
  }

  /**
   * The `<img>`'s inline style, serialized as React writes it.
   * @returns The `style` attribute text.
   */
  protected imgStyle(): string | null {
    return styleText({
      width: this.size,
      height: this.size,
      borderRadius: 6,
      objectFit: 'cover',
      flexShrink: 0,
      background: TILE_BACKGROUND,
    })
  }

  /**
   * The fallback tile's inline style, serialized as React writes it.
   * @returns The `style` attribute text.
   */
  protected tileStyle(): string | null {
    return styleText({
      width: this.size,
      height: this.size,
      borderRadius: 6,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background: TILE_BACKGROUND,
      color: 'var(--mol-color-primary, #6366f1)',
    })
  }

  /**
   * The initial letter's inline style, serialized as React writes it
   * (`fontWeight`/`lineHeight` are unitless, `fontSize` gains `px`).
   * @returns The `style` attribute text.
   */
  protected initialStyle(): string | null {
    return styleText({
      fontSize: Math.round(this.size * 0.45),
      fontWeight: 600,
      lineHeight: 1,
    })
  }

  /**
   * The interactive wrapper's accessible name, translated with the locale.
   * @returns The button label.
   */
  protected buttonLabel(): string {
    return this.t('ide.chat.viewProfile', undefined, { defaultValue: 'View profile' })
  }

  /**
   * The button's inline style: the click-carrying box the ClassMap has no
   * opinion about, with the 1px border always present (transparent at rest)
   * so hovering never shifts layout. Serialized as React writes it.
   * @returns The `style` attribute text.
   */
  protected buttonStyle(): string | null {
    // `background` goes last: the adapter applies this text as a `style`
    // attribute, and jsdom's style parser drops `background: transparent`
    // when a longhand declaration follows it. The normalizer sorts
    // declarations anyway, and React writes the same set at runtime.
    return styleText({
      padding: 0,
      margin: 0,
      borderRadius: 6,
      display: 'inline-flex',
      flexShrink: 0,
      cursor: 'pointer',
      lineHeight: 0,
      boxSizing: 'border-box',
      transition: 'box-shadow 100ms',
      background: 'transparent',
      border: this.hover()
        ? '1px solid var(--mol-color-primary, #6366f1)'
        : '1px solid transparent',
    })
  }

  /**
   * Forwards the host click to the caller's handler (React hands the caller's
   * own function to the element; the event arg travels the same way).
   * @param event - The native click event.
   */
  protected onHostClick(event: Event): void {
    this.onClick?.(event)
  }
}
