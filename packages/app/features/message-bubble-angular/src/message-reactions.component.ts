/**
 * MessageReactions component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { MessageReaction } from './types.js'

/**
 * MessageReactions component.
 *
 * Row of reaction chips below a message body — each chip shows emoji + count,
 * and the viewer's own reaction is marked with `aria-pressed` only (no visual
 * highlight ships). The host IS the outer `<div>`
 * (`div[mol-message-reactions]`), matching React's root exactly.
 */
@Component({
  selector: 'div[mol-message-reactions]',
  standalone: true,
  inputs: ['reactions', 'onToggle', 'onAdd', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (reaction of reactions; track reaction.emoji) {<button type="button" (click)="toggle(reaction)" [attr.aria-pressed]="reaction.reactedByMe ?? null" [class]="chipClasses()"><span>{{ reaction.emoji }}</span><span>{{ reaction.count }}</span></button>}@if (onAdd) {<button type="button" (click)="add($event)" [class]="addClasses()">+</button>}`,
})
export class MessageReactions {
  /** The reactions to render, in order. */
  reactions: MessageReaction[] = []
  /** Called when a chip is toggled (React's `onToggle`). */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked (React's `onAdd`); the button renders only when it is set. */
  onAdd?: (event: Event) => void
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
   * The wrapper's class list (React's `cm.cn(cm.flex({…}), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      this.className,
    )
  }

  /**
   * A chip's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  chipClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().sp('px', 2),
      this.cm().sp('py', 1),
      this.cm().textSize('xs'),
      this.cm().roundedFull,
    )
  }

  /**
   * The add button's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  addClasses(): string {
    return this.cm().cn(this.cm().sp('px', 2), this.cm().sp('py', 1), this.cm().textSize('xs'))
  }

  /**
   * Toggles one reaction, as React's chip click does.
   * @param reaction - The clicked chip's reaction.
   */
  toggle(reaction: MessageReaction): void {
    this.onToggle?.(reaction.emoji)
  }

  /**
   * Reports the "+" click, as React's `onClick={onAdd}` does (the click event
   * is the callback's argument).
   * @param event - The click event.
   */
  add(event: Event): void {
    this.onAdd?.(event)
  }
}
