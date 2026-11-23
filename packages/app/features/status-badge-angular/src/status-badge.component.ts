/**
 * StatusBadge component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { StatusKind } from './types.js'

const KIND_TO_COLOR: Record<StatusKind, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Semantic status badge — maps status kinds to ClassMap color variants.
 *
 * The host IS the span React renders (`span[mol-status-badge]`), so both
 * appearances stay a single `<span>`: `'ui'` (default) carries the ClassMap
 * `badge` classes of the framework `<Badge>`, and `'uppercase-pill'` the same
 * per-kind colors plus `cm.uppercase` + `cm.trackingWide`. The optional icon
 * is projected as `[slot=icon]` content inside React's
 * `<span class="mr-1">…</span>` wrapper; the wrapper is detached when the
 * projection carries no nodes, exactly as React renders nothing for an absent
 * icon.
 */
@Component({
  selector: 'span[mol-status-badge]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['kind', 'appearance', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<span [class]="iconClass()" #iconSlot
      ><ng-content select="[slot=icon]"></ng-content
    ></span>
    <ng-content></ng-content>`,
})
export class StatusBadge {
  /** Semantic kind — maps to ClassMap badge color variants (defaults to `'neutral'`). */
  kind?: StatusKind
  /** Visual appearance variant (defaults to `'ui'`). */
  appearance?: 'ui' | 'uppercase-pill'
  /** Extra classes passed through to the rendered element. */
  className?: string

  /** The icon wrapper (always in the template; detached when unused). */
  @ViewChild('iconSlot') iconSlot?: ElementRef<HTMLSpanElement>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The semantic kind (React's `kind = 'neutral'` default parameter).
   * @returns The kind.
   */
  kindValue(): StatusKind {
    return this.kind ?? 'neutral'
  }

  /**
   * Computes the root span's class list, per appearance: React's `<Badge>`
   * classes for `'ui'`, the uppercase pill's classes for `'uppercase-pill'`.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    const color = KIND_TO_COLOR[this.kindValue()]
    if ((this.appearance ?? 'ui') === 'uppercase-pill') {
      return cm.cn(cm.badge({ variant: color }), cm.uppercase, cm.trackingWide, this.className)
    }
    return cm.cn(cm.badge({ variant: color }), this.className)
  }

  /**
   * Computes the icon wrapper's class list (`cm.sp('mr', 1)`).
   * @returns The class string.
   */
  iconClass(): string {
    return this.cm().sp('mr', 1)
  }

  /**
   * Renders the icon wrapper only while its slot has content — React renders
   * no wrapper for an absent icon. The `<ng-content>` capture point stays in
   * the template, so the wrapper leaves the page instead, and comes back when
   * a consumer projects an icon later.
   */
  constructor() {
    usePlacement((hasContent) => {
      const icon = this.iconSlot?.nativeElement
      setElementPresent(icon, icon ? hasContent(icon) : false)
    })
  }
}
