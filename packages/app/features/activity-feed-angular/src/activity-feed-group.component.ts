/**
 * ActivityFeedGroup component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './activity-feed-item.component.js'
import type { ActivityFeedItemData } from './types.js'

/**
 * ActivityFeedGroup component.
 *
 * Date-grouped activity section — a heading followed by a stack of items.
 * Compose multiple groups together for an organized "Today / Yesterday / Last
 * week" feed. The host IS the root `<section>`
 * (`section[mol-activity-feed-group]`), matching React's root exactly. The
 * heading is plain text, a template reference, or `[slot=heading]` projected
 * content.
 */
@Component({
  selector: 'section[mol-activity-feed-group]',
  standalone: true,
  imports: [NgTemplateOutlet, ActivityFeedItem],
  inputs: ['heading', 'items', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<h3 [class]="headingClasses()">@if (headingTemplate(); as headingTpl) {<ng-container [ngTemplateOutlet]="headingTpl"></ng-container>}@else if (hasTextHeading()) {<ng-container>{{ heading }}</ng-container>}<ng-content select="[slot=heading]"></ng-content></h3><div [class]="listClasses()">@for (item of items; track item.id) {<article mol-activity-feed-item [item]="item"></article>}</div>`,
})
export class ActivityFeedGroup {
  /** Group heading — typically a formatted date ("Today", "Yesterday", "Mar 12"). */
  heading?: string | number | TemplateRef<unknown>
  /** Items in this group. */
  items: ActivityFeedItemData[] = []
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
   * Computes the section's class list (`cm.stack(3)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * Computes the heading's class list (`cm.textSize('xs')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the rows wrapper's class (`cm.stack(4)`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().stack(4))
  }

  /**
   * The heading as an input template (a node passed as a prop rather than
   * projected as `[slot=heading]`), when there is one.
   * @returns The heading template, or null.
   */
  headingTemplate(): TemplateRef<unknown> | null {
    return this.heading instanceof TemplateRef ? this.heading : null
  }

  /**
   * Whether the heading input itself carries text (React's `{heading}` for a
   * string child; a node arrives as `[slot=heading]` content instead).
   * @returns True for a string or number heading.
   */
  hasTextHeading(): boolean {
    return typeof this.heading === 'string' || typeof this.heading === 'number'
  }
}
