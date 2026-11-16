/**
 * KanbanCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isTemplate, templateOf, textOf } from './nodes.js'
import type { KanbanCardData } from './types.js'

/**
 * Single card inside a Kanban column.
 *
 * The Angular counterpart of `@molecule/app-kanban-board-react`'s `KanbanCard`:
 * the same props (React names) and the same DOM for the same input. The host IS
 * React's root: the `Card` div (`div[mol-kanban-card]`) when no `onDragStart` is
 * supplied, or the outer `draggable` div wrapping it. The `Card`'s classes are
 * computed here the way `@molecule/app-ui-react`'s `Card` computes them, so the
 * root element and its classes match React exactly.
 */
@Component({
  selector: 'div[mol-kanban-card]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['card', 'onClick', 'onDragStart', 'className'],
  host: {
    '[attr.class]': 'hostClass()',
    '[attr.draggable]': 'hasDragStart() ? "true" : null',
    '(dragstart)': 'handleDragStart($event)',
    '(click)': 'handleHostClick()',
  },
  // prettier-ignore
  template: `<ng-template #inner><div [class]="stackClasses()"><h4 [class]="titleClasses()">@if (isTemplate(cardTitle())) {<ng-container [ngTemplateOutlet]="templateOf(cardTitle())"></ng-container>}@else {{{ textOf(cardTitle()) }}}</h4>@if (cardBody()) {<div [class]="bodyClasses()">@if (isTemplate(cardBody())) {<ng-container [ngTemplateOutlet]="templateOf(cardBody())"></ng-container>}@else {{{ textOf(cardBody()) }}}</div>}@if (cardFooter()) {<div [class]="footerClasses()">@if (isTemplate(cardFooter())) {<ng-container [ngTemplateOutlet]="templateOf(cardFooter())"></ng-container>}@else {{{ textOf(cardFooter()) }}}</div>}</div></ng-template>@if (hasDragStart()) {<div [class]="cardClasses()" (click)="handleClick()"><ng-container [ngTemplateOutlet]="inner"></ng-container></div>}@else {<ng-container [ngTemplateOutlet]="inner"></ng-container>}`,
})
export class KanbanCard {
  /** The card to render. */
  card?: KanbanCardData
  /** Called when the card is clicked (e.g. open a detail modal). */
  onClick?: (card: KanbanCardData) => void
  /** HTML5 drag start — adds the `draggable` wrapper when supplied. */
  onDragStart?: (card: KanbanCardData, event: DragEvent) => void
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a drag-start handler was supplied — React adds the `draggable`
   * wrapper only then.
   *
   * @returns True when `onDragStart` is set.
   */
  hasDragStart(): boolean {
    return Boolean(this.onDragStart)
  }

  /**
   * The `Card`'s class list — React's `Card` with `cursorPointer` and this
   * component's `className`, in the same token order.
   *
   * @returns The class string.
   */
  cardClasses(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.cm().cn(this.cm().cursorPointer, this.className),
    )
  }

  /**
   * The host's class list: the `Card` classes when the host IS the card, and
   * nothing when the host is the drag wrapper.
   *
   * @returns The class string, or null for no class attribute.
   */
  hostClass(): string | null {
    return this.hasDragStart() ? null : this.cardClasses()
  }

  /**
   * The card's title, as React reads `card.title`.
   *
   * @returns The title, or undefined before a card is bound.
   */
  cardTitle(): string | number | TemplateRef<unknown> | undefined {
    return this.card?.title
  }

  /**
   * The card's body, as React reads `card.body`.
   *
   * @returns The body, or undefined.
   */
  cardBody(): string | number | TemplateRef<unknown> | undefined {
    return this.card?.body
  }

  /**
   * The card's footer, as React reads `card.footer`.
   *
   * @returns The footer, or undefined.
   */
  cardFooter(): string | number | TemplateRef<unknown> | undefined {
    return this.card?.footer
  }

  /**
   * The inner content's class list (`cm.stack(2)`).
   *
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(2))
  }

  /**
   * The title's class list.
   *
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The body's class list.
   *
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The footer's class list.
   *
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }))
  }

  /**
   * Calls the card's click handler with the card, as React's `Card` onClick does.
   */
  handleClick(): void {
    if (this.card) this.onClick?.(this.card)
  }

  /**
   * The host's click: it is the card only when no drag wrapper is rendered —
   * otherwise the inner div owns the click, as in React.
   */
  handleHostClick(): void {
    if (this.hasDragStart()) return
    this.handleClick()
  }

  /**
   * Starts a drag with the card, when a handler was supplied.
   *
   * @param event - The drag start event.
   */
  handleDragStart(event: DragEvent): void {
    if (!this.card || !this.onDragStart) return
    this.onDragStart(this.card, event)
  }

  /**
   * Whether a field is a template reference.
   *
   * @param value - The value.
   * @returns True when it is a template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value as string | number | TemplateRef<unknown> | undefined)
  }

  /**
   * Narrows a field to its template reference.
   *
   * @param value - The field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return templateOf(value as string | number | TemplateRef<unknown> | undefined)
  }

  /**
   * The text a field renders.
   *
   * @param value - The field.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return textOf(value as string | number | TemplateRef<unknown> | undefined)
  }
}
