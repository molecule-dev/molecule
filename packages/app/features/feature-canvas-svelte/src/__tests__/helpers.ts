/**
 * Render and event helpers shared by the Svelte canvas tests.
 *
 * @module
 */

import type { Component } from 'svelte'
import { flushSync, mount, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'

import Host from './helpers/Host.svelte'

/** A component mounted through {@link mountValues}. */
export interface MountedComponent<P extends object> {
  /** The host element the component rendered into. */
  container: HTMLElement
  /** The store the component's props come from. */
  values: Writable<P>
  /** Hands the same mounted component new props (React's `rerender`). */
  update(next: Partial<P>): void
  /** Tears the component down. */
  unmount(): Promise<void>
}

const instances: Array<{ unmount: () => Promise<void> }> = []

/**
 * Mounts one component with props held in a store, so they can change on the
 * same mount.
 *
 * @param component - The component to mount.
 * @param initial - Its initial props.
 * @returns Handles to update and unmount it.
 */
export function mountValues<P extends object>(
  component: Component<P>,
  initial: NoInfer<P>,
): MountedComponent<P> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const values = writable<P>(initial)
  const instance = mount(Host<P>, {
    target: container,
    props: { component, values },
  })
  flushSync()
  const mounted: MountedComponent<P> = {
    container,
    values,
    update(next: Partial<P>): void {
      values.update((current) => ({ ...current, ...next }))
      flushSync()
    },
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
