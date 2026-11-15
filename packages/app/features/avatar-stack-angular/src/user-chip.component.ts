/**
 * UserChip component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, hasNodes } from '@molecule/app-ui-angular'

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
  inputs: ['name', 'src', 'subtitle', 'trailing', 'size', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div mol-avatar [src]="src" [alt]="name" [name]="name" [size]="avatarSize()"></div>
    <div [class]="bodyClasses()">
      <span [class]="nameClasses()">{{ name }}</span>
      @if (showSubtitle()) {<span #subtitleEl [class]="cm().textSize('xs')">@if (hasTextSubtitle()) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]"></ng-content></span>}
    </div>
    <ng-content select="[slot=trailing]"></ng-content>`,
})
export class UserChip implements AfterViewInit {
  /** Display name. */
  name = ''
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
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
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
