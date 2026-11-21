/**
 * Render helpers shared by the Solid canvas-engine tests.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'

import type { CanvasEngine, CanvasEngineProps } from '../CanvasEngine.jsx'
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
  props?: Partial<CanvasEngineProps>
}

/** A mounted engine under test. */
export interface MountedEngine {
  /** The element the engine mounted into. */
  container: HTMLElement
  /** The engine's imperative handle (set at mount). */
  engine(): CanvasEngineHandle | undefined
  /** The document the engine last reported (or the mounted one). */
  doc(): CanvasDocument
  /** The selection the engine last reported (or the mounted one). */
  selection(): CanvasSelection
  /** Merges props over the current ones. */
  rerender(next: Partial<CanvasEngineProps>): void
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
export function mountEngine(
  engineComponent: typeof CanvasEngine,
  options: EngineOptions,
): MountedEngine {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [doc, setDoc] = createSignal<CanvasDocument>(options.doc)
  const [selection, setSelection] = createSignal<CanvasSelection>(options.selection ?? [])
  const [extra, setExtra] = createSignal<Partial<CanvasEngineProps>>({ ...(options.props ?? {}) })
  let handle: CanvasEngineHandle | undefined

  const Engine = engineComponent
  const Host = (): JSX.Element => (
    <Engine
      ref={(next) => {
        handle = next
      }}
      document={doc()}
      onChange={options.controlled ? (next) => setDoc(next) : undefined}
      selection={selection()}
      onSelectionChange={options.controlled ? (next) => setSelection(next) : undefined}
      snapToGrid={extra().snapToGrid}
      gridSize={extra().gridSize}
      showGrid={extra().showGrid}
      ariaLabel={extra().ariaLabel}
    />
  )

  const dispose = render(Host, container)
  return {
    container,
    engine: () => handle,
    doc,
    selection,
    rerender(next: Partial<CanvasEngineProps>): void {
      setExtra({ ...extra(), ...next })
    },
    unmount(): void {
      dispose()
      container.remove()
    },
  }
}
