/**
 * Accordion component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, EventEmitter, inject, Output } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { nextInstanceId } from '../utilities/ids.js'
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
 * uncontrolled pair). Each item's trigger and content ids carry the
 * instance's own prefix, so two accordions on one page never share an id
 * (React's `useId` is unique per item of every instance), and are minted
 * once per item value, so replacing the `items` array keeps them.
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
    'automationId',
    'dataMolId: data-mol-id',
    'disabled',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
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
        [disabled]="item.disabled || disabled"
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
export class Accordion implements HasElement<HTMLDivElement> {
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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string
  /** Disables every header, whatever an item says (React's `disabled`). */
  disabled?: boolean

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string node value. */
  readonly nodeText = nodeText

  /** Fires the new expansion state (single value, or array in multiple mode). */
  @Output() readonly change = new EventEmitter<string | string[]>()

  private internalExpanded: string[] | null = null
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)
  /**
   * The prefix of every id this instance renders. It is this instance's own, from the kit's
   * per-instance counter, where React's `useId` is unique per item of every instance.
   */
  private readonly idBase = nextInstanceId()
  /** Each item value's ids, minted on first render; a value never goes into an id itself. */
  private readonly idMap = new Map<string, { trigger: string; content: string }>()

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
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
    )
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
   * The ids of one item's trigger and its content region. Both carry this instance's prefix, so
   * every `aria-controls` and `aria-labelledby` resolves inside its own accordion, and each
   * value keeps the ids it was first given, so replacing the `items` array keeps them. The value
   * itself stays out of the id: one with a space would split the `aria-controls` reference.
   *
   * @param value - The item value.
   * @returns The trigger and content ids.
   */
  ids(value: string): { trigger: string; content: string } {
    let ids = this.idMap.get(value)
    if (!ids) {
      const n = this.idMap.size
      ids = { trigger: `${this.idBase}-t${n}`, content: `${this.idBase}-c${n}` }
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
