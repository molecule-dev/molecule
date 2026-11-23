/**
 * RowWithActions component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { templateOf, textOf } from './slot-dom.js'

/**
 * RowWithActions component.
 *
 * `<tr>` wrapper that adds a trailing actions cell plus a click handler on the
 * body — the Angular counterpart of `@molecule/app-data-table-ui-react`'s
 * `RowWithActions`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input. The host IS the `<tr>`
 * (`tr[mol-row-with-actions]`), matching React's root exactly.
 *
 * The row cells are the element's default projected content; `actions` is
 * `[slot=actions]` content, a `TemplateRef`, or text. A click inside the actions
 * cell does not reach the row's handler (React's `stopPropagation`).
 */
@Component({
  selector: 'tr[mol-row-with-actions]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['actions', 'onClick', 'selected', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.aria-selected]': 'selected ?? null',
    '(click)': 'runClick($event)',
  },
  template: `<ng-content></ng-content>
    <td #actionsCell [class]="actionsCellClasses()" (click)="stopClick($event)">
      <ng-content select="[slot=actions]"></ng-content>
      @if (actionsTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" />
      }
      {{ actionsText() }}
    </td>`,
})
export class RowWithActions {
  /** Action buttons/menu for the trailing cell (a `TemplateRef` or `[slot=actions]` content). */
  actions?: unknown
  /** Called when the row body is clicked, with the click event. */
  onClick?: (event: MouseEvent) => void
  /** Whether the row renders in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string

  /** The trailing actions cell, detached while React renders none. */
  @ViewChild('actionsCell') private actionsCell?: ElementRef<HTMLElement>

  constructor() {
    usePlacement((hasContent) => this.syncActions(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The row's class list: React adds `cursor-pointer` only when the row is
   * clickable, then the caller's classes.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.onClick ? this.cm().cursorPointer : undefined, this.className)
  }

  /**
   * The actions cell's class list (`text-center`).
   * @returns The class string.
   */
  actionsCellClasses(): string {
    return this.cm().cn(this.cm().textCenter)
  }

  /**
   * The actions' text (React's `{actions}` for text).
   * @returns The text, or `''` for a node actions slot.
   */
  actionsText(): string {
    return typeof this.actions === 'string' || typeof this.actions === 'number'
      ? textOf(this.actions)
      : ''
  }

  /**
   * The actions' template, when the caller passed a node.
   * @returns The template, or null.
   */
  actionsTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.actions)
  }

  /**
   * Runs the row's click handler the way React's `onClick` does.
   * @param event - The native click event.
   */
  runClick(event: MouseEvent): void {
    this.onClick?.(event)
  }

  /**
   * Stops a click inside the actions cell from reaching the row (React's
   * `onClick={(e) => e.stopPropagation()}`).
   * @param event - The native click event.
   */
  stopClick(event: MouseEvent): void {
    event.stopPropagation()
  }

  /**
   * Keeps the actions cell in the DOM exactly while React renders it.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncActions(hasContent: SlotReader): void {
    const cell = this.actionsCell?.nativeElement
    const projected = hasContent(cell)
    setElementPresent(cell, this.actions !== undefined || projected)
  }
}
