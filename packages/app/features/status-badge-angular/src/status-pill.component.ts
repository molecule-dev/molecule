/**
 * StatusPill component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { StatusKind } from './types.js'

const DOT_COLOR: Record<StatusKind, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-outline',
}

/**
 * Rounded status pill with an optional leading colored dot.
 *
 * The host IS the span React renders (`span[mol-status-pill]`). The pill has NO
 * background surface of its own — only the dot carries color — so add a
 * surface via `className` if you need a filled pill. The label is the default
 * projection; the dot is a boolean prop, exactly as in React.
 */
@Component({
  selector: 'span[mol-status-pill]',
  standalone: true,
  inputs: ['kind', 'dot', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `@if (showDot()) {
      <span [class]="dotClass()" aria-hidden="true"></span>
    }
    <ng-content></ng-content>`,
})
export class StatusPill {
  /** Semantic kind (defaults to `'neutral'`). */
  kind?: StatusKind
  /** Whether the leading dot renders (defaults to true). */
  dot?: boolean
  /** Extra classes. */
  className?: string

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
   * Whether the leading dot renders (React's `dot = true` default parameter).
   * @returns True while the dot renders.
   */
  showDot(): boolean {
    return this.dot ?? true
  }

  /**
   * Computes the root span's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 1),
      this.cm().roundedFull,
      this.cm().textSize('xs'),
      this.cm().fontWeight('medium'),
      this.className,
    )
  }

  /**
   * Computes the dot span's class list (`cm.w(2)` + `cm.h(2)` + `cm.roundedFull`
   * + the kind's color token).
   * @returns The class string.
   */
  dotClass(): string {
    const cm = this.cm()
    return cm.cn(cm.w(2), cm.h(2), cm.roundedFull, DOT_COLOR[this.kindValue()])
  }
}
