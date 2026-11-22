/**
 * The clickable author-name in a message header — a reset `<button>` that
 * renders exactly like the bold name span it replaces, with an underline on
 * hover/focus as the affordance, and opens the author's profile like their
 * avatar does.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `AuthorNameButton` (see
 * that file for the design notes): the same prop (React's `onClick`), the same
 * DOM for the same input. Its own component so the hover state never re-renders
 * the (heavy) message row. The host IS the `<button>` (React's root), so the
 * caller's content is projected from `<ng-content>` and no node is added.
 *
 * The full button reset is written through `[attr.style]`, whose text lands in
 * the DOM as is, so every declaration is pre-serialized the way React's CSSOM
 * writes it (`padding: 0px`, `border: medium`, `font: inherit`). React also
 * passes `fontWeight: 600`, but the CSSOM's `font` shorthand absorbs it and the
 * serialized style has no `font-weight`; the port matches the serialized style,
 * as the other parts do.
 *
 * @module
 */

import { Component } from '@angular/core'

import { styleText } from '@molecule/app-ui-angular'

/** Props for {@link AuthorNameButton} — the React prop names, React's own contract. */
export interface AuthorNameButtonProps {
  /** Opens the author's profile. */
  onClick: () => void
}

/**
 * The author's display name as a button that opens their profile.
 */
@Component({
  selector: 'button[mol-author-name-button]',
  standalone: true,
  inputs: ['onClick'],
  host: {
    type: 'button',
    'data-mol-id': 'chat-user-name-button',
    '[attr.style]': 'buttonStyle()',
    '(click)': 'handleClick()',
    '(mouseenter)': 'setHover($event, true)',
    '(mouseleave)': 'setHover($event, false)',
    '(focus)': 'setHover($event, true)',
    '(blur)': 'setHover($event, false)',
  },
  template: '<ng-content />',
})
export class AuthorNameButton {
  /** Opens the author's profile. */
  onClick?: () => void

  /**
   * The button's full reset at rest (React's inline style, serialized as the
   * CSSOM records it).
   * @returns The style attribute text.
   */
  protected buttonStyle(): string | null {
    return styleText({
      padding: 0,
      margin: 0,
      border: 'medium',
      background: 'transparent',
      font: 'inherit',
      color: 'inherit',
      cursor: 'pointer',
      textDecoration: 'none',
    })
  }

  /** Forwards the click to the caller's handler. */
  protected handleClick(): void {
    this.onClick?.()
  }

  /**
   * The underline affordance, written straight onto the button the way React's
   * `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` write the style.
   *
   * @param event - The mouse or focus event.
   * @param on - True on enter/focus, false on leave/blur.
   */
  protected setHover(event: Event, on: boolean): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLElement)) return
    element.style.textDecoration = on ? 'underline' : 'none'
  }
}
