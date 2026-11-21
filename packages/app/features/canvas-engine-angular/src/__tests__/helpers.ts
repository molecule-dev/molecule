/**
 * Mount helpers for the Angular canvas-engine tests: the component created
 * through Angular's real renderer, with its inputs assigned the way a host's
 * template binding assigns them.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { CanvasEngine } from '../canvas-engine.component.js'
import type { CanvasDocument, CanvasSelection } from '../types.js'

/** The props a mounted engine is given, kept mutable so a test can re-pass them. */
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

/** A mounted engine: its DOM, the component instance, a props setter and a teardown. */
export interface MountedEngine {
  /** The element the component rendered into. */
  readonly host: HTMLElement
  /** The engine component instance (its imperative methods). */
  engine(): CanvasEngine
  /** The props the component was given. */
  props(): Record<string, unknown>
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Flushes change detection, as an event does before the browser draws. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the canvas engine through Angular's renderer, assigning its inputs as
 * a host template does.
 *
 * @param options - The engine's initial props (see {@link EngineOptions}).
 * @returns The mounted engine.
 */
export async function mountEngine(options: EngineOptions): Promise<MountedEngine> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<CanvasEngine> = createComponent(CanvasEngine, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)

  const props: Record<string, unknown> = {
    document: options.doc,
    selection: options.selection ?? [],
    ...(options.controlled
      ? {
          onChange: (next: CanvasDocument) => {
            props['document'] = next
            // The host re-renders with the document it reported.
            ref.instance.document = next
          },
          onSelectionChange: (next: CanvasSelection) => {
            props['selection'] = next
            ref.instance.selection = next
          },
        }
      : {}),
    ...(options.props ?? {}),
  }

  /** Assigns every prop to the component's matching input. */
  const apply = (): void => {
    ref.instance.document = props['document'] as CanvasDocument
    ref.instance.onChange = props['onChange'] as CanvasEngine['onChange']
    ref.instance.selection = props['selection'] as CanvasEngine['selection']
    ref.instance.onSelectionChange = props['onSelectionChange'] as CanvasEngine['onSelectionChange']
    ref.instance.snapToGrid = props['snapToGrid'] as CanvasEngine['snapToGrid']
    ref.instance.gridSize = props['gridSize'] as CanvasEngine['gridSize']
    ref.instance.width = props['width'] as CanvasEngine['width']
    ref.instance.height = props['height'] as CanvasEngine['height']
    ref.instance.showGrid = props['showGrid'] as CanvasEngine['showGrid']
    ref.instance.ariaLabel = props['ariaLabel'] as CanvasEngine['ariaLabel']
    ref.instance.historyLimit = props['historyLimit'] as CanvasEngine['historyLimit']
    ref.instance.className = props['className'] as CanvasEngine['className']
  }

  apply()
  ref.changeDetectorRef.markForCheck()
  appRef.tick()
  appRef.tick()

  return {
    host,
    engine: () => ref.instance,
    props: () => props,
    setProps: (next: Record<string, unknown>) => {
      Object.assign(props, next)
      apply()
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}
