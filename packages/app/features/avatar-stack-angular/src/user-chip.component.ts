/**
 * UserChip component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  type ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  ViewChild,
} from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, ElementPropsWriter, styleText } from '@molecule/app-ui-angular'

import type { UserChipProps } from './types.js'

/**
 * `nameLinkProps` keys the template owns: `href` is the input, `className` /
 * `class` are composed into the template's `[class]` binding, the style is
 * serialized by `nameLinkStyle()`, and the rest cannot replace the name or the
 * profile `data-mol-id`.
 */
const OWNED_NAME_LINK_KEYS = new Set([
  'className',
  'class',
  'href',
  'children',
  'innerHTML',
  'textContent',
  'style',
])

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
  hostDirectives: [MolPlacement],
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
      <span #subtitleEl [class]="cm().textSize('xs')">@if (hasTextSubtitle()) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]"></ng-content></span>
    </div>
    <ng-content select="[slot=trailing]"></ng-content>`,
})
export class UserChip implements AfterViewChecked, OnDestroy {
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

  /** The subtitle span (a text input or projected content lands here). */
  @ViewChild('subtitleEl', { static: true }) private subtitleEl?: ElementRef<HTMLSpanElement>

  /** The name anchor, present only while href is defined. */
  @ViewChild('nameLink') private nameLink?: ElementRef<HTMLAnchorElement>

  private readonly renderer = inject(Renderer2)
  private renderedNameLink?: HTMLAnchorElement
  private nameLinkWriter?: ElementPropsWriter

  /**
   * Renders the subtitle span only while it has a text input or projected
   * content (React's `{subtitle && <span>…}`), including content a consumer
   * projects later.
   */
  constructor() {
    usePlacement((hasContent) => {
      const subtitle = this.subtitleEl?.nativeElement
      setElementPresent(subtitle, this.hasTextSubtitle() || (!!subtitle && hasContent(subtitle)))
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
   * The avatar size passed to `<div mol-avatar>` (React's `size = 'sm'`
   * default parameter).
   * @returns The size preset.
   */
  avatarSize(): 'xs' | 'sm' | 'md' | 'lg' {
    return this.size ?? 'sm'
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
      this.nameLinkWriter?.destroy()
      this.nameLinkWriter = undefined
      this.renderedNameLink = link
    }
    if (!link) return
    this.nameLinkWriter ??= new ElementPropsWriter(this.renderer, link)
    // The profile id is the default: a caller's own `data-mol-id` wins, as
    // React's spread order does.
    this.nameLinkWriter.write(
      { 'data-mol-id': 'user-chip-profile', ...this.nameLinkProps },
      OWNED_NAME_LINK_KEYS,
    )
  }

  /** Removes link listeners when the chip unmounts. */
  ngOnDestroy(): void {
    this.nameLinkWriter?.destroy()
    this.nameLinkWriter = undefined
  }
}
