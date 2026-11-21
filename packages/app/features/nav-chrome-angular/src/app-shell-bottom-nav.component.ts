/**
 * AppShellBottomNav component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isNodeTemplate } from './internal.js'
import type { NavItem } from './types.js'

/**
 * Mobile/tablet bottom tab bar — typically 3–5 primary nav destinations.
 * Each item shows icon + short label. The host IS the `<nav>`
 * (`nav[mol-nav-bottom]`), matching React's root exactly.
 */
@Component({
  selector: 'nav[mol-nav-bottom]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'activeId', 'onItemClick', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'navLabel()',
  },
  template: `@for (it of items; track it.id) {
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
    </button>
  }`,
})
export class AppShellBottomNav {
  /** Tab items (typically 3–5 primary destinations). */
  items: NavItem[] = []
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked. */
  onItemClick?: (item: NavItem) => void
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
   * The nav region's accessible name (prop-free: `t()` > English default).
   * @returns The nav region's label.
   */
  navLabel(): string {
    return this.i18n.t('navChrome.aria.bottom', undefined, { defaultValue: 'Bottom' })
  }

  /**
   * The nav class list (React's `cm.cn(cm.flex({ align: 'stretch' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'stretch' }), this.className)
  }

  /**
   * One tab button's class list.
   * @param it - The nav item.
   * @returns The class string.
   */
  itemClasses(it: NavItem): string {
    return this.cm().cn(
      this.cm().flex1,
      this.cm().flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
      this.cm().sp('py', 2),
      this.cm().textSize('xs'),
      it.id === this.activeId ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
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
   * The value as a template ref (checked by {@link AppShellBottomNav.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * Activates a tab (React's `onClick={() => onItemClick?.(it)}`).
   * @param it - The nav item.
   */
  activate(it: NavItem): void {
    this.onItemClick?.(it)
  }
}
