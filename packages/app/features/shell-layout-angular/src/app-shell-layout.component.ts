/**
 * AppShellLayout component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-angular'

/**
 * AppShellLayout component.
 *
 * Top-level page scaffold: header → main (constrained by {@link Container}) →
 * footer. The host IS the outer `<div>` (`div[mol-shell-layout]`), matching
 * React's root exactly. The page frame uses ClassMap tokens (`cm.page`,
 * `cm.appLayout`) so the styling library can be swapped without touching
 * consumers. The header and footer are projected slots (`[slot=header]`,
 * `[slot=footer]`) so consumers retain full control over branding, navigation,
 * and footer copy.
 */
@Component({
  selector: 'div[mol-shell-layout]',
  standalone: true,
  imports: [Container],
  inputs: ['maxWidth', 'className', 'mainClassName', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<ng-content select="[slot=header]"></ng-content>
    <main [class]="mainClassName">
      <div mol-container [maxWidth]="containerWidth()"><ng-content></ng-content></div>
    </main>
    <ng-content select="[slot=footer]"></ng-content>`,
})
export class AppShellLayout {
  /** Container max-width for the main content (defaults to `'xl'` at read time). */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** Extra classes on the inner `<main>` element (no padding by default). */
  mainClassName?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().page, this.cm().appLayout, this.className)
  }

  /**
   * The container max width (React's default parameter: a later-bound write
   * of `undefined` must not erase the `'xl'` default).
   * @returns The max width.
   */
  containerWidth(): string {
    return this.maxWidth ?? 'xl'
  }
}
