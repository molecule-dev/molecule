/**
 * Render helpers shared by the Vue canvas-engine tests.
 *
 * @module
 */

import {
  type Component,
  createApp,
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
  type VNode,
} from 'vue'

import type { CanvasDocument, CanvasEngineHandle, CanvasSelection } from '../types.js'

/** The props a mounted engine is given, kept reactive so a test can re-pass them. */
export interface EngineOptions {
  /** The initial (and controlled) document. */
  doc: CanvasDocument
  /** The initial selection. */
  selection?: CanvasSelection
  /** Whether the engine runs controlled (`onChange` / `onSelectionChange` given). */
  controlled?: boolean
  /** Extra props merged onto the engine (`snapToGrid`, `gridSize`, …). */
  props?: Record<string, unknown>
}

/** A mounted engine under test. */
export interface MountedEngine {
  /** The element the engine mounted into. */
  container: HTMLElement
  /** The engine's exposed imperative handle. */
  engine: Ref<CanvasEngineHandle | null>
  /** The document the engine last reported (or the mounted one). */
  doc: Ref<CanvasDocument>
  /** The selection the engine last reported (or the mounted one). */
  selection: Ref<CanvasSelection>
  /** Merges props over the current ones and flushes the render. */
  rerender(next: Record<string, unknown>): Promise<void>
  /** Tears the engine down and removes its host. */
  unmount(): void
}

/**
 * Mounts the engine with props a host owns (React's stateful host: the host
 * keeps the document and selection the engine reports).
 *
 * @param engineComponent - The engine component to mount.
 * @param options - Its initial props (see {@link EngineOptions}).
 * @returns The mounted engine.
 */
export function mountEngine(engineComponent: Component, options: EngineOptions): MountedEngine {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const engine = ref<CanvasEngineHandle | null>(null)
  const doc = ref<CanvasDocument>(options.doc)
  const selection = ref<CanvasSelection>(options.selection ?? [])
  const extra = ref<Record<string, unknown>>({ ...(options.props ?? {}) })
  const Host = defineComponent({
    setup() {
      return (): VNode =>
        h(engineComponent, {
          ref: engine,
          document: doc.value,
          ...(options.controlled
            ? {
                onChange: (next: CanvasDocument) => {
                  doc.value = next
                },
              }
            : {}),
          selection: selection.value,
          ...(options.controlled
            ? {
                onSelectionChange: (next: CanvasSelection) => {
                  selection.value = next
                },
              }
            : {}),
          ...extra.value,
        })
    },
  })
  const app = createApp(Host)
  app.mount(container)
  return {
    container,
    engine,
    doc,
    selection,
    async rerender(next: Record<string, unknown>): Promise<void> {
      extra.value = { ...extra.value, ...next }
      await nextTick()
    },
    unmount(): void {
      app.unmount()
      container.remove()
    },
  }
}
