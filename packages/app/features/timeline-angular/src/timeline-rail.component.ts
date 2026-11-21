/**
 * TimelineRail component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * TimelineRail component.
 *
 * Left-hand rail of a timeline row — renders the marker (a default dot when
 * none is given) and an optional vertical connector extending downward. The
 * host IS the rail's outer `<div>` (`div[mol-timeline-rail]`), matching React's
 * root exactly. A node-valued marker is an `ng-template` reference rendered
 * through `NgTemplateOutlet`; the connector's inline style is applied the way
 * React applies it (through the CSSOM), so the serialized attribute matches.
 *
 * This is the Angular counterpart of `@molecule/app-timeline-react`'s
 * `TimelineRail`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 */
@Component({
  selector: 'div[mol-timeline-rail]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['marker', 'connector', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div>
      @if (markerTemplate(); as marker) {
        <ng-container [ngTemplateOutlet]="marker" />
      } @else if (markerText() !== null) {
        {{ markerText() }}
      } @else {
        <span aria-hidden="true">•</span>
      }
    </div>
    @if (hasConnector()) {
      <div [class]="connectorClasses()" [style]="connectorStyle()"></div>
    }`,
})
export class TimelineRail {
  /** Marker for this row, as a template reference or plain text. */
  marker?: string | number | TemplateRef<unknown>
  /** Whether to render the vertical connector below the marker (defaults to `true`). */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the outer rail class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col', align: 'center' }),
      this.cm().shrink0,
      this.className,
    )
  }

  /**
   * React's `connector = true` default: an absent input keeps the connector.
   * @returns Whether the connector renders.
   */
  hasConnector(): boolean {
    return this.connector ?? true
  }

  /**
   * Whether the marker holds a node (an `ng-template` reference) rather than text.
   * @returns True when it renders through a template outlet.
   */
  markerTemplate(): TemplateRef<unknown> | null {
    return this.marker instanceof TemplateRef ? this.marker : null
  }

  /**
   * The text a marker renders (React renders strings and numbers as text).
   * @returns The text, or null when the marker is a node or absent.
   */
  markerText(): string | null {
    if (typeof this.marker === 'string') return this.marker
    if (typeof this.marker === 'number') return String(this.marker)
    return null
  }

  /**
   * Computes the connector's class list (`cm.w(0)` + `cm.h('full')`).
   * @returns The class string.
   */
  connectorClasses(): string {
    return this.cm().cn(this.cm().w(0), this.cm().h('full'))
  }

  /**
   * The connector's inline style, exactly React's object.
   * @returns The style declarations.
   */
  connectorStyle(): Record<string, string> {
    return { 'border-left': '1px solid currentColor', opacity: '0.2', 'min-height': '24px' }
  }
}
