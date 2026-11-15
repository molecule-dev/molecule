/**
 * StatusTimeline component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { StatusTimelineStep } from './types.js'

/**
 * StatusTimeline component.
 *
 * Vertical ordered-step status timeline: each step renders as a colored dot
 * + label; steps at or before the current one are "reached" (filled dot);
 * the current step's label is bolded; later steps are dimmed via
 * `cm.textMuted`. The host IS the outer `<ol>` (`ol[mol-status-timeline]`),
 * matching React's root exactly, and the rows are tracked by the step's
 * `key` value (`@for (…; track step.key)`), like React's per-item keys.
 *
 * This is the Angular counterpart of `@molecule/app-status-timeline-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 */
@Component({
  selector: 'ol[mol-status-timeline]',
  standalone: true,
  inputs: ['steps', 'currentKey', 'ariaLabel', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel ?? null',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `@for (step of steps; track step.key; let i = $index) {
    <li [class]="cm().flex({ align: 'center', gap: 'sm' })">
      <span
        [class]="
          cm().cn(
            cm().roundedFull,
            cm().statusTimelineDot,
            reached(i) ? cm().bgPrimary : cm().statusTimelineDotIdle
          )
        "
        aria-hidden="true"
      ></span>
      <span
        [class]="
          cm().cn(reached(i) ? '' : cm().textMuted, isCurrent(i) ? cm().fontWeight('semibold') : '')
        "
        >{{ step.label }}</span
      >
    </li>
  }`,
})
export class StatusTimeline {
  /** Ordered list of steps from earliest to latest. */
  steps: ReadonlyArray<StatusTimelineStep> = []
  /** The key of the current step. */
  currentKey?: string
  /** Aria-label for the timeline ordered list. */
  ariaLabel?: string
  /** Extra classes on the outer `<ol>`. */
  className?: string
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
   * The index of the current step (its key's position), or -1 when no step matches.
   * @returns The current index.
   */
  currentIdx(): number {
    return this.steps.findIndex((s) => s.key === this.currentKey)
  }

  /**
   * Computes the outer `<ol>` class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().statusTimelineList, this.cm().textSize('sm'), this.className)
  }

  /**
   * Whether the step at `i` is at or before the current one.
   * @param i - The step's index.
   * @returns Whether the step is reached.
   */
  reached(i: number): boolean {
    return this.currentIdx() >= 0 && i <= this.currentIdx()
  }

  /**
   * Whether the step at `i` is the current one.
   * @param i - The step's index.
   * @returns Whether the step is current.
   */
  isCurrent(i: number): boolean {
    return i === this.currentIdx()
  }
}
