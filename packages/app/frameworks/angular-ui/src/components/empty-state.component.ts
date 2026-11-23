/**
 * EmptyState component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'

/**
 * EmptyState component.
 *
 * Shown when a list or section has no data: an optional icon badge, a title,
 * a description, and an optional action slot. React renders the icon/action
 * wrapper divs only when those node props exist; here the wrappers always
 * exist as projection capture points and are taken out of the DOM when empty
 * (`setElementPresent`).
 */
@Component({
  selector: 'div[mol-empty-state]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'icon',
    'title',
    'description',
    'action',
    'className',
    'style',
    'testId',
    'automationId',
  ],
  host: {
    // `title` is this component's heading, which React renders as text; Angular would also keep a
    // static `title="…"` on the host, where the browser shows it as a tooltip.
    '[attr.title]': 'null',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'automationId',
  },
  template: `<div [class]="cm().emptyStateIcon" #iconSlot>
      <ng-content select="[slot=icon]"></ng-content>
    </div>
    <h3 [class]="cm().emptyStateTitle">{{ title }}</h3>
    @if (description) {
      <p [class]="cm().emptyStateDescription">{{ description }}</p>
    }
    <div [class]="cm().emptyStateAction" #actionSlot>
      <ng-content select="[slot=action]"></ng-content>
    </div>`,
})
export class EmptyState implements HasElement<HTMLDivElement> {
  /** An `icon` node prop (TemplateRef), when passed as a prop instead of a slot. */
  icon?: unknown
  /** Heading text. */
  title?: string
  /** Description text. */
  description?: string
  /** An `action` node prop (TemplateRef), when passed as a prop instead of a slot. */
  action?: unknown
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id`. */
  automationId?: string

  /** The icon wrapper (detached unless the slot captured nodes). */
  @ViewChild('iconSlot') iconSlot?: ElementRef<HTMLDivElement>
  /** The action wrapper. */
  @ViewChild('actionSlot') actionSlot?: ElementRef<HTMLDivElement>

  private hasIcon = false
  private hasAction = false

  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Detaches the icon and action wrappers React would not render. */
  constructor() {
    usePlacement((hasContent) => this.syncWrappers(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().emptyState, this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Applies React's `{icon && <div>…}` / `{action && <div>…}` conditions.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncWrappers(hasContent: SlotReader): void {
    this.hasIcon =
      this.icon !== undefined && this.icon !== null
        ? true
        : hasContent(this.iconSlot?.nativeElement)
    this.hasAction =
      this.action !== undefined && this.action !== null
        ? true
        : hasContent(this.actionSlot?.nativeElement)
    setElementPresent(this.iconSlot?.nativeElement, this.hasIcon)
    setElementPresent(this.actionSlot?.nativeElement, this.hasAction)
  }
}
