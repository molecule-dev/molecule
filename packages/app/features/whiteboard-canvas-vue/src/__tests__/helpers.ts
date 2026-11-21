/**
 * Render and event helpers shared by the Vue whiteboard canvas tests.
 *
 * @module
 */

import { type Component, createApp, defineComponent, h, nextTick, ref } from 'vue'

/** A mounted component under test. */
export interface MountedComponent {
  /** The element the component was mounted into. */
  container: HTMLElement
  /** Mounts again with these props (merged over the current ones). */
  rerender(props: Record<string, unknown>): Promise<void>
  /** Tears the component down and removes its host. */
  unmount(): void
}

/**
 * Mounts one component with props.
 *
 * @param component - The component to mount.
 * @param props - Its initial props.
 * @returns Handles to re-render and unmount it.
 */
export function mountComponent(
  component: Component,
  props: Record<string, unknown>,
): MountedComponent {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const current = ref<Record<string, unknown>>({ ...props })
  const app = createApp(
    defineComponent({
      setup() {
        return () => h(component, current.value)
      },
    }),
  )
  app.mount(container)
  return {
    container,
    async rerender(next: Record<string, unknown>): Promise<void> {
      current.value = { ...current.value, ...next }
      await nextTick()
    },
    unmount(): void {
      app.unmount()
      container.remove()
    },
  }
}

/**
 * Dispatches one pointer event the way a browser's primary mouse pointer does.
 *
 * @param el - The element to dispatch on.
 * @param type - The event type.
 * @param init - Its client position and button.
 */
export function firePointer(
  el: Element,
  type: string,
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number } = {},
): void {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: init.pointerId ?? 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: init.button ?? 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
    }),
  )
}
