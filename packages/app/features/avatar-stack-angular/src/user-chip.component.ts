/**
 * UserChip component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, hasNodes, styleText } from '@molecule/app-ui-angular'

import type { UserChipProps } from './types.js'

/**
 * UserChip component.
 *
 * Avatar + name + optional subtitle row — useful in dropdowns, mention
 * pickers, assignment popovers, and row-level user references. The host IS the
 * outer `<div>` (`div[mol-user-chip]`), matching React's root exactly. The
 * node props are projected slots: `subtitle` renders inside its own
 * `<span>`, `trailing` renders bare at the end of the row. The subtitle span
 * renders optimistically so a projection can land, then withdraws at view
 * init when neither a text input nor a projection is present — React renders
 * no span at all for an absent or empty subtitle.
 */
@Component({
  selector: 'div[mol-user-chip]',
  standalone: true,
  imports: [Avatar],
  inputs: ['name', 'href', 'nameLinkProps', 'src', 'subtitle', 'trailing', 'size', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (href === undefined) {<div mol-avatar [src]="src" [alt]="name" [name]="name" [size]="avatarSize()"></div>}
    @else {<div aria-hidden="true"><div mol-avatar [src]="src" [alt]="name" [name]="name" [size]="avatarSize()"></div></div>}
    <div [class]="bodyClasses()">
      @if (href === undefined) {<span [class]="nameClasses()">{{ name }}</span>}
      @else {<a #nameLink data-mol-id="user-chip-profile" [href]="href" [class]="nameClasses(true)" [attr.style]="nameLinkStyle()">{{ name }}</a>}
      @if (showSubtitle()) {<span #subtitleEl [class]="cm().textSize('xs')">@if (hasTextSubtitle()) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]"></ng-content></span>}
    </div>
    <ng-content select="[slot=trailing]"></ng-content>`,
})
export class UserChip implements AfterViewInit, AfterViewChecked, OnDestroy {
  /** Display name. */
  name = ''
  /** Profile destination. The avatar stays outside the single name link. */
  href?: string
  /** Attributes, classes and event handlers for the canonical name link. */
  nameLinkProps?: UserChipProps['nameLinkProps']
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line: text, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional trailing content: projected `[slot=trailing]` content. */
  trailing?: unknown
  /** Avatar size preset (defaults to `'sm'` at read time). */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string

  /** The optimistic subtitle span (projected content lands here). */
  @ViewChild('subtitleEl') private subtitleEl?: ElementRef<HTMLSpanElement>

  /** The name anchor, present only while href is defined. */
  @ViewChild('nameLink') private nameLink?: ElementRef<HTMLAnchorElement>

  private readonly renderer = inject(Renderer2)
  private renderedNameLink?: HTMLAnchorElement
  private appliedNameLinkProps = new Map<string, unknown>()
  private readonly nameLinkListeners = new Map<string, () => void>()

  /** Whether the subtitle span renders (withdrawn when nothing fills it). */
  private readonly subtitleProjected = signal(true)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The avatar size passed to `<div mol-avatar>` (React's `size = 'sm'`
   * default parameter).
   * @returns The size preset.
   */
  avatarSize(): 'xs' | 'sm' | 'md' | 'lg' {
    return this.size ?? 'sm'
  }

  /**
   * Whether the subtitle span renders.
   * @returns True while the span is kept.
   */
  showSubtitle(): boolean {
    return this.subtitleProjected()
  }

  /**
   * Whether the subtitle input itself carries text (React's `{subtitle}` for
   * a string child; a node arrives as `[slot=subtitle]` content instead).
   * @returns True for a string or number subtitle.
   */
  hasTextSubtitle(): boolean {
    return typeof this.subtitle === 'string' || typeof this.subtitle === 'number'
  }

  /**
   * Computes the outer row's class list (`cm.flex({ align: 'center', gap:
   * 'sm' })` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * Computes the name/subtitle column's class list (`cm.flex1` +
   * `cm.stack(0)`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * Computes the name span's class list (`cm.textSize('sm')` +
   * `cm.fontWeight('medium')`).
   * @param linked - Whether to include the name-link classes.
   * @returns The class string.
   */
  nameClasses(linked = false): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      this.cm().fontWeight('medium'),
      linked && this.nameLinkProps?.className,
      linked && this.nameLinkProps?.class,
    )
  }

  /**
   * Serializes the link's inline style with the shared React-compatible utility.
   * @returns The style attribute, or null when absent.
   */
  nameLinkStyle(): string | null {
    return styleText(this.nameLinkProps?.style)
  }

  /** Applies the link attribute input to the anchor, including changes and removals. */
  ngAfterViewChecked(): void {
    const link = this.nameLink?.nativeElement
    if (link !== this.renderedNameLink) {
      this.clearNameLinkListeners()
      this.appliedNameLinkProps.clear()
      this.renderedNameLink = link
    }
    if (!link) return

    const next = new Map<string, unknown>(
      Object.entries({ 'data-mol-id': 'user-chip-profile', ...this.nameLinkProps }),
    )
    // These are owned by the template: href and children cannot replace the profile/name.
    for (const key of [
      'className',
      'class',
      'href',
      'children',
      'innerHTML',
      'textContent',
      'style',
    ])
      next.delete(key)
    for (const key of new Set([...this.appliedNameLinkProps.keys(), ...next.keys()])) {
      const value = next.get(key)
      if (this.appliedNameLinkProps.has(key) && this.appliedNameLinkProps.get(key) === value)
        continue
      this.nameLinkListeners.get(key)?.()
      this.nameLinkListeners.delete(key)
      if (/^on[A-Z]/.test(key)) {
        if (typeof value === 'function') {
          const capture = key.endsWith('Capture')
          const event = key.slice(2, capture ? -7 : undefined).toLowerCase()
          this.nameLinkListeners.set(
            key,
            this.renderer.listen(
              link,
              event === 'doubleclick' ? 'dblclick' : event,
              (event: Event) => {
                value(event)
              },
              { capture },
            ),
          )
        }
      } else if (!key.startsWith('on')) {
        const textBoolean = /^(aria-|data-)|^(contentEditable|draggable|spellCheck)$/.test(key)
        if (value == null || (value === false && !textBoolean))
          this.renderer.removeAttribute(link, key)
        else
          this.renderer.setAttribute(link, key, value === true && !textBoolean ? '' : String(value))
      }
    }
    this.appliedNameLinkProps = next
  }

  /** Removes link listeners when the chip unmounts. */
  ngOnDestroy(): void {
    this.clearNameLinkListeners()
  }

  /** Removes listeners when the anchor is replaced or the chip unmounts. */
  private clearNameLinkListeners(): void {
    for (const remove of this.nameLinkListeners.values()) remove()
    this.nameLinkListeners.clear()
  }

  /**
   * Withdraws the optimistic subtitle span when its slot projection did not
   * land: when neither a text input nor projected content is present, React
   * renders no span at all. View queries resolve at view init, and a projected
   * slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const subtitle = this.subtitleEl?.nativeElement
    if (subtitle && !this.hasTextSubtitle() && !hasNodes(subtitle)) {
      this.subtitleProjected.set(false)
    }
  }
}
