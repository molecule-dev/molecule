/**
 * Render and event helpers shared by the Svelte whiteboard canvas tests.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'

/** A mounted component under test. */
export interface MountedComponent {
  /** The host element the component rendered into. */
  container: HTMLElement
  /** Tears the component down and removes its host. */
  unmount(): Promise<void>
}

const instances: Array<{ unmount: () => Promise<void> }> = []

/**
 * Mounts one component with props, as a host renders it.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The mounted component.
 */
export function mountComponent<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): MountedComponent {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(component, { target: container, props })
  flushSync()
  const mounted: MountedComponent = {
    container,
    async unmount(): Promise<void> {
      await unmount(instance)
      container.remove()
    },
  }
  instances.push(mounted)
  return mounted
}

/**
 * Unmounts every component mounted through this module and clears the document.
 *
 * @returns A promise that settles once everything is gone.
 */
export async function cleanup(): Promise<void> {
  for (const instance of instances.splice(0)) await instance.unmount()
  document.body.innerHTML = ''
}

/**
 * Dispatches one pointer event the way a browser's primary mouse pointer does.
 *
 * @param el - The element to dispatch on.
 * @param type - The event type.
 * @param init - Its client position, pointer id and button.
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
