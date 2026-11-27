/**
 * Scoped drag and drop bindings for renderer-neutral React elements.
 *
 * @module
 */

import { type ComponentType, createContext, type ReactNode, type Ref, useContext } from 'react'

import type { ElementDragProps, ElementHandle } from '@molecule/app-ui'

import { webScopedDragDrop } from './scoped-web.js'
import type { DragDropContextOptions, DragStartEvent } from './types.js'

/** The events and children managed by one drag interaction scope. */
export interface DragScopeProps extends Pick<
  DragDropContextOptions,
  'onDragStart' | 'onDragMove' | 'onDragEnd'
> {
  children: ReactNode
}

/** Localized controls for moving a source directly to a target. */
export interface DragMoveControls {
  /** Automation id of the control that opens the destination choices. */
  id: string
  /** Label of the control that opens the choices. */
  label: string
  /** Label of the control while the choices are open. */
  cancelLabel: string
  /** ClassMap classes for the controls. */
  className?: string
  /** Allowed destinations with their localized action labels. */
  choices: readonly { targetId: string; label: string }[]
}

/** The source identity and content a renderer can make draggable. */
export interface DragSourceProps {
  source: DragStartEvent
  controls?: DragMoveControls
  children: ReactNode
}

/** A drop target in the current scope. */
export interface DragTargetProps {
  id: string
  children: ReactNode
}

/** Host bindings, including the drag gesture on element kits that expose it. */
export interface ScopedDragHostProps extends ElementDragProps {
  /** Receives the existing web element or native host. */
  ref?: Ref<ElementHandle>
}

/** Configuration shared by dedicated handles and targets that also serve as sources. */
export interface ScopedDragSourceOptions {
  /** Prevents pickup on both renderers without removing this host as a possible target. */
  disabled?: boolean
  /** Suppresses the browser's default pointer-down behavior for a dedicated drag handle. */
  preventDefault?: boolean
  /** Localized destination controls for the device renderer, beside the authored source. */
  controls?: DragMoveControls
}

/** Binds a source to an authored host without adding a browser node or attribute. */
export interface ScopedDragSourceProps extends ScopedDragSourceOptions {
  /** Identity and optional application data of the dragged item. */
  source: DragStartEvent
  /** Renders the existing drag handle with its binding. */
  children: (host: ScopedDragHostProps) => ReactNode
}

/** Registers an authored target, optionally allowing the same host to start a drag. */
export interface ScopedDragTargetProps {
  /** Identity used as the destination and, when enabled, as the source. */
  id: string
  /** Enables pickup from the target itself, leaving its embedded controls independent. */
  source?: ScopedDragSourceOptions
  /** Renders the existing target row with its binding. */
  children: (host: ScopedDragHostProps) => ReactNode
}

/** Renderer bindings for an isolated drag scope with authored source and target hosts. */
export interface ScopedDragDropRenderer {
  /** Owns the gesture, callbacks and targets for one feature instance. */
  Scope: ComponentType<DragScopeProps>
  /** Binds a dedicated handle within the scope. */
  Source: ComponentType<ScopedDragSourceProps>
  /** Registers the target host within the scope. */
  Target: ComponentType<ScopedDragTargetProps>
}

/** A renderer's drag gesture scope, sources and targets. */
export interface DragDropRenderer {
  Scope: ComponentType<DragScopeProps>
  Source: ComponentType<DragSourceProps>
  Target: ComponentType<DragTargetProps>
  /** Authored-host bindings, when supported by the renderer. */
  scoped?: ScopedDragDropRenderer
}

const RendererContext = createContext<DragDropRenderer | null>(null)

/** Supplies the renderer-specific drag bindings to feature components below it. */
export const DragDropRendererProvider = RendererContext.Provider

/**
 * Reads the drag bindings from the surrounding renderer provider.
 *
 * @returns The configured renderer, or `null` to use the feature's web bindings.
 */
export function useDragDropRenderer(): DragDropRenderer | null {
  return useContext(RendererContext)
}

/**
 * Reads the authored-host bindings supplied by the device renderer, or the browser bindings.
 *
 * @returns Components that bind the scope and its existing source and target elements.
 */
export function useScopedDragDrop(): ScopedDragDropRenderer {
  return useDragDropRenderer()?.scoped ?? webScopedDragDrop
}
