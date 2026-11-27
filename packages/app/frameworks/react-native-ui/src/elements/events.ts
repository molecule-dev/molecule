/**
 * Web-shaped events for the handlers of native elements.
 *
 * @module
 */

import type { KitEvent, KitFocusEvent, KitKeyboardEvent, KitMouseEvent } from '@molecule/app-ui'

/**
 * The members every kit event has, over a native event.
 *
 * @param stop - Stops the native event's propagation.
 * @param target - The field whose value changed.
 * @returns The event members.
 */
export function kitEvent(
  stop: () => void = () => undefined,
  target: EventTarget | null = null,
): KitEvent {
  let prevented = false
  return {
    target,
    currentTarget: target,
    get defaultPrevented(): boolean {
      return prevented
    },
    preventDefault(): void {
      prevented = true
    },
    stopPropagation: stop,
  }
}

/** A change event whose target carries the input's current properties. */
export function fieldEvent(properties: object): KitEvent {
  const target = Object.assign(
    {
      addEventListener(): void {},
      removeEventListener(): void {},
      dispatchEvent: (): boolean => false,
    },
    properties,
  )
  return kitEvent(undefined, target)
}

/**
 * A press, hover or click as the mouse event a handler written for the web receives.
 *
 * @param event - The native event.
 * @param button - The mouse button that changed state.
 * @returns The mouse event.
 */
export function mouseEvent(
  event: { nativeEvent: { pageX: number; pageY: number }; stopPropagation(): void } | undefined,
  button = 0,
): KitMouseEvent {
  const x = event?.nativeEvent.pageX ?? 0
  const y = event?.nativeEvent.pageY ?? 0
  return Object.assign(
    kitEvent(() => event?.stopPropagation()),
    {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      button,
      buttons: 0,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      detail: 1,
      relatedTarget: null,
    },
  )
}

/**
 * The physical key (`code`) the web reports for a key value a device's keyboard sends.
 *
 * @param key - The key value (`'a'`, `'Enter'`, `' '`).
 * @returns The code (`'KeyA'`, `'Enter'`, `'Space'`), or `''` when there is none.
 */
function keyCode(key: string): string {
  if (key === ' ') return 'Space'
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`
  if (/^\d$/.test(key)) return `Digit${key}`
  return key.length > 1 ? key : ''
}

/**
 * A key a device's keyboard sent to a text field, as the keyboard event a handler written for the
 * web receives. A device's keyboard holds no modifiers and does not repeat.
 *
 * @param key - The key value React Native reports (`'a'`, `'Enter'`, `'Backspace'`).
 * @returns The keyboard event.
 */
export function keyboardEvent(key: string): KitKeyboardEvent {
  return Object.assign(
    kitEvent(() => undefined),
    {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      key,
      code: keyCode(key),
      repeat: false,
    },
  )
}

/**
 * A native focus or blur as the focus event a handler written for the web receives.
 *
 * @returns The focus event.
 */
export function focusEvent(): KitFocusEvent {
  return Object.assign(
    kitEvent(() => undefined),
    { relatedTarget: null },
  )
}
