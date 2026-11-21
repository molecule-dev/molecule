/**
 * AppShellTopNav component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isNodeTemplate } from './internal.js'
import type { NavItem } from './types.js'

/**
 * Top navigation shell.
 *
 * Logo on the left, nav items in the centre, app-level actions on the
 * right. The host IS the `<header>` (`header[mol-nav-top]`), matching
 * React's root exactly. Node props (`logo`, `right`) are projected content
 * (`[slot=logo]`, `[slot=right]`) or plain string inputs.
 */
@Component({
  selector: 'header[mol-nav-top]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['logo', 'items', 'activeId', 'onItemClick', 'right', 'className'],
  host: { '[class]': 'classes()' },
  template: `<div [class]="rowClasses()">
      @if (hasLogo) {
        <ng-container>{{ logo }}</ng-container>
      }
      <ng-content select="[slot=logo]"></ng-content>
      @if (items && items.length > 0) {
        <nav [attr.aria-label]="navLabel()" [class]="navClasses()">
          @for (it of items; track it.id) {
            <button
              type="button"
              (click)="activate(it)"
              [disabled]="!!it.disabled"
              [attr.aria-current]="it.id === activeId ? 'page' : null"
              [class]="itemClasses(it)"
            >
              @if (isTemplate(it.icon)) {
                <ng-container [ngTemplateOutlet]="asTemplate(it.icon)"></ng-container>
              } @else if (it.icon != null) {
                <ng-container>{{ it.icon }}</ng-container>
              }
              <span>
                @if (isTemplate(it.label)) {
                  <ng-container [ngTemplateOutlet]="asTemplate(it.label)"></ng-container>
                } @else {
                  <ng-container>{{ it.label }}</ng-container>
                }
              </span>
              @if (isTemplate(it.badge)) {
                <ng-container [ngTemplateOutlet]="asTemplate(it.badge)"></ng-container>
              } @else if (it.badge != null) {
                <ng-container>{{ it.badge }}</ng-container>
              }
            </button>
          }
        </nav>
      }
    </div>
    <div [class]="rightClasses()">
      @if (hasRight) {
        <ng-container>{{ right }}</ng-container>
      }
      <ng-content select="[slot=right]"></ng-content>
    </div>`,
})
export class AppShellTopNav {
  /** Left-side brand / logo slot — a string input or `[slot=logo]` content. */
  logo?: unknown
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — a string input or `[slot=right]` content. */
  right?: unknown
  /** Extra classes. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The centre nav region's accessible name (prop-free: `t()` > English default).
   * @returns The nav region's label.
   */
  navLabel(): string {
    return this.i18n.t('navChrome.aria.main', undefined, { defaultValue: 'Main' })
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.flex(...), cm.sp(...), cm.sp(...), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 3),
      this.className,
    )
  }

  /**
   * The left-side row's class list (`cm.flex({ align: 'center', gap: 'lg' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'lg' })
  }

  /**
   * The centre nav's class list (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  navClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The right-side row's class list (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rightClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * One nav item button's class list.
   * @param it - The nav item.
   * @returns The class string.
   */
  itemClasses(it: NavItem): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().sp('px', 2),
      this.cm().sp('py', 1),
      this.cm().textSize('sm'),
      it.id === this.activeId ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * Whether a text logo input renders (a projected logo is not).
   * @returns True when the logo input renders as text.
   */
  get hasLogo(): boolean {
    return hasText(this.logo)
  }

  /**
   * Whether a text right-slot input renders.
   * @returns True when the right input renders as text.
   */
  get hasRight(): boolean {
    return hasText(this.right)
  }

  /**
   * Whether the value is a node template.
   * @param value - The prop value.
   * @returns True for a template ref.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isNodeTemplate(value)
  }

  /**
   * The value as a template ref (checked by {@link AppShellTopNav.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * Activates a nav item (React's `onClick={() => onItemClick?.(it)}`).
   * @param it - The nav item.
   */
  activate(it: NavItem): void {
    this.onItemClick?.(it)
  }
}
