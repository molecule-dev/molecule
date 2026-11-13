/**
 * Accordion component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, EventEmitter, Output } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { asTemplate, nodeText } from '../utilities/node-value.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'

/** One accordion item (React's `AccordionItem`). */
export interface AccordionItemData {
  /** The item's value (identity for expansion state). */
  value: string
  /** The header (text, or a TemplateRef from a node value). */
  header?: unknown
  /** The body (text, or a TemplateRef from a node value). */
  content?: unknown
  /** Whether the item's trigger is disabled. */
  disabled?: boolean
}

/**
 * Accordion component.
 *
 * The host is the `div.accordionRoot` React renders. Items carry their
 * header/content as text or TemplateRef node values; expansion state is
 * internal unless the `value` input controls it (React's controlled /
 * uncontrolled pair), and ids are generated per item value so replacing the
 * `items` array keeps them stable (React's `useId` per item component).
 */
@Component({
  selector: 'div[mol-accordion]',
  standalone: true,
  imports: [MolIconSvg, NgTemplateOutlet],
  inputs: [
    'items',
    'value',
    'defaultValue',
    'multiple',
    'collapsible',
    'className',
    'style',
    'testId',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `@for (item of items ?? []; track item.value) {
    <div [class]="cm().accordionItem" [attr.data-state]="isOpen(item.value) ? 'open' : 'closed'">
      <button
        type="button"
        [attr.id]="ids(item.value).trigger"
        [class]="cm().cn(cm().accordion({ variant: 'default' }), cm().accordionTriggerBase)"
        (click)="toggle(item.value)"
        [attr.aria-expanded]="isOpen(item.value) ? 'true' : 'false'"
        [attr.aria-controls]="ids(item.value).content"
        [attr.data-state]="isOpen(item.value) ? 'open' : 'closed'"
        [disabled]="item.disabled"
      >
        @if (asTemplate(item.header); as tpl) {
          <ng-container [ngTemplateOutlet]="tpl" />
        } @else {
          {{ nodeText(item.header) }}
        }
        <svg mol-icon [data]="chevron()" />
      </button>
      <div
        [attr.id]="ids(item.value).content"
        role="region"
        [attr.aria-labelledby]="ids(item.value).trigger"
        [attr.data-state]="isOpen(item.value) ? 'open' : 'closed'"
        [class]="cm().accordionContent"
        [style.display]="isOpen(item.value) ? 'block' : 'none'"
      >
        <div [class]="cm().accordionContentInner">
          @if (asTemplate(item.content); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            {{ nodeText(item.content) }}
          }
        </div>
      </div>
    </div>
  }`,
})
export class Accordion {
  /** The items to render. */
  items?: AccordionItemData[]
  /** Controlled expanded value(s). */
  value?: string | string[]
  /** Uncontrolled initial expanded value(s). */
  defaultValue?: string | string[]
  /** Whether several items may stay expanded. */
  multiple?: boolean
  /** Whether the last expanded item may collapse. */
  collapsible?: boolean
  /** Extra classes joined onto the root classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the root. */
  testId?: string

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string node value. */
  readonly nodeText = nodeText

  /** Fires the new expansion state (single value, or array in multiple mode). */
  @Output() readonly change = new EventEmitter<string | string[]>()

  private internalExpanded: string[] | null = null
  private readonly idMap = new Map<string, { trigger: string; content: string }>()
  private idCount = 0

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().accordionRoot, this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The chevron glyph every trigger renders.
   * @returns The resolved icon.
   */
  chevron(): ResolvedIcon {
    return resolveIcon('chevron-down', this.cm().accordionChevron)
  }

  /**
   * Normalizes a value prop to the expanded list (React's `normalizeValue`).
   *
   * @param v - The single value, array, or undefined.
   * @returns The expanded values.
   */
  private normalize(v: string | string[] | undefined): string[] {
    if (v === undefined) return []
    return Array.isArray(v) ? v : [v]
  }

  /**
   * The expanded items: the controlled `value` when given, else the internal
   * state (seeded from `defaultValue` at first use).
   * @returns The expanded values.
   */
  expandedItems(): string[] {
    if (this.value !== undefined) return this.normalize(this.value)
    if (this.internalExpanded === null) this.internalExpanded = this.normalize(this.defaultValue)
    return this.internalExpanded
  }

  /**
   * Whether one item is expanded.
   *
   * @param value - The item value.
   * @returns True when expanded.
   */
  isOpen(value: string): boolean {
    return this.expandedItems().includes(value)
  }

  /**
   * The stable per-item ids (React generates them per item component; keying
   * by item value keeps them stable across an `items` replacement).
   *
   * @param value - The item value.
   * @returns The trigger and content ids.
   */
  ids(value: string): { trigger: string; content: string } {
    let ids = this.idMap.get(value)
    if (!ids) {
      ids = { trigger: `t${this.idCount}`, content: `c${this.idCount}` }
      this.idCount++
      this.idMap.set(value, ids)
    }
    return ids
  }

  /**
   * React's `toggleItem`: collapse guards `collapsible`, expand replaces or
   * appends per `multiple`, internal state updates only when uncontrolled,
   * and `onChange` receives the new state (single value or array).
   *
   * @param itemValue - The toggled item's value.
   */
  toggle(itemValue: string): void {
    const current = this.expandedItems()
    let next: string[]
    if (current.includes(itemValue)) {
      if (this.collapsible === false && current.length === 1) return
      next = current.filter((v) => v !== itemValue)
    } else {
      next = this.multiple ? [...current, itemValue] : [itemValue]
    }
    if (this.value === undefined) this.internalExpanded = next
    if (this.multiple) this.change.emit(next)
    else this.change.emit(next[0] ?? '')
  }
}
