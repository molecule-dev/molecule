/**
 * Render helpers shared by the Svelte canvas-engine tests.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'

import type {
  CanvasDocument,
  CanvasEngineHandle,
  CanvasEngineProps,
  CanvasSelection,
} from '../types.js'
import CanvasHost from './helpers/CanvasHost.svelte'

/** The props a mounted engine is given, kept reactive so a test can re-pass them. */
export interface EngineOptions {
  /** The initial (and controlled) document. */
  doc: CanvasDocument
  /** The initial selection. */
  selection?: CanvasSelection
  /** Whether the engine runs controlled (`onChange` / `onSelectionChange` given). */
  controlled?: boolean
  /** Extra props merged onto the engine (`snapToGrid`, `gridSize`, …). */
  props?: Partial<CanvasEngineProps>
}

/** A mounted engine under test. */
export interface MountedEngine {
  /** The element the engine mounted into. */
  container: HTMLElement
  /** The engine's imperative methods (`bind:this`). */
  engine(): CanvasEngineHandle | undefined
  /** The document the engine last reported (or the mounted one). */
  doc(): CanvasDocument
  /** The selection the engine last reported (or the mounted one). */
  selection(): CanvasSelection
  /** Merges props over the current ones. */
  rerender(next: Partial<CanvasEngineProps>): void
  /** Tears the engine down and removes its host. */
  unmount(): Promise<void>
}

/** The mounted engines, so {@link cleanup} can take them all down. */
const instances: Array<{ unmount: () => Promise<void> }> = []

/**
 * Mounts the engine through a host that owns its props (React's stateful host).
 *
 * @param options - The engine's initial props (see {@link EngineOptions}).
 * @returns The mounted engine.
 */
export function mountEngine(options: EngineOptions): MountedEngine {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const slot: { instance?: CanvasEngineHandle } = {}
  const values = writable<CanvasEngineProps>({
    document: options.doc,
    selection: options.selection ?? [],
    ...(options.controlled
      ? {
          onChange: (next: CanvasDocument) => {
            values.update((current) => ({ ...current, document: next }))
          },
          onSelectionChange: (next: CanvasSelection) => {
            values.update((current) => ({ ...current, selection: next }))
          },
        }
      : {}),
    ...(options.props ?? {}),
  })
  const instance = mount(CanvasHost, { target: container, props: { values, slot } })
  flushSync()
  const mounted: MountedEngine = {
    container,
    engine: () => slot.instance,
    doc: () => get(values).document,
    selection: () => get(values).selection ?? [],
    rerender(next: Partial<CanvasEngineProps>): void {
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
 * Unmounts every engine mounted through this module and clears the document.
 *
 * @returns A promise that settles once everything is gone.
 */
export async function cleanup(): Promise<void> {
  for (const instance of instances.splice(0)) await instance.unmount()
  document.body.innerHTML = ''
}
