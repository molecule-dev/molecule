/**
 * `@molecule/app-keyboard`
 * Utility functions for keyboard module
 */

import { hasProvider, hide, onHide, onShow } from './provider.js'
import type { KeyboardShowEvent } from './types.js'

/**
 * Automatically hide the keyboard when the user clicks outside of input elements.
 * @param element - The element to attach the click listener to (default: document).
 * @returns A function that removes the click listener when called.
 */
export function hideOnOutsideClick(element?: HTMLElement): () => void {
  const target = element || (typeof document !== 'undefined' ? document : null)

  if (!target) {
    return () => {}
  }

  const handler = (event: Event): void => {
    const target = event.target as HTMLElement
    const isInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    if (!isInput && hasProvider()) {
      hide().catch(() => {})
    }
  }

  target.addEventListener('click', handler)

  return () => {
    target.removeEventListener('click', handler)
  }
}

/**
 * Create a keyboard-aware container that adjusts its padding or margin when the keyboard appears.
 * @param paddingProperty - The CSS property to adjust: 'paddingBottom' or 'marginBottom' (default: 'paddingBottom').
 * @returns A controller with `enable` and `disable` methods to manage keyboard-aware behavior.
 */
export function createKeyboardAwareContainer(
  paddingProperty: 'paddingBottom' | 'marginBottom' = 'paddingBottom',
): {
  enable(element: HTMLElement): void
  disable(): void
} {
  let unsubscribeShow: (() => void) | null = null
  let unsubscribeHide: (() => void) | null = null
  let targetElement: HTMLElement | null = null
  let originalPadding = ''

  return {
    enable(element: HTMLElement) {
      targetElement = element
      originalPadding = element.style[paddingProperty]

      if (hasProvider()) {
        unsubscribeShow = onShow((event: KeyboardShowEvent) => {
          if (targetElement) {
            targetElement.style[paddingProperty] = `${event.keyboardHeight}px`
          }
        })

        unsubscribeHide = onHide(() => {
          if (targetElement) {
            targetElement.style[paddingProperty] = originalPadding
          }
        })
      }
    },

    disable() {
      if (unsubscribeShow) {
        unsubscribeShow()
        unsubscribeShow = null
      }
      if (unsubscribeHide) {
        unsubscribeHide()
        unsubscribeHide = null
      }
      if (targetElement) {
        targetElement.style[paddingProperty] = originalPadding
        targetElement = null
      }
    },
  }
}
