/**
 * Scoped drag and drop bindings for renderer-neutral React elements.
 *
 * @module
 */

import { type ComponentType, createContext, useContext } from 'react'

import type { ElementNode } from '@molecule/app-ui-react/elements'

import type { DragDropContextOptions, DragStartEvent } from './types.js'

/** The events and children managed by one drag interaction scope. */
export interface DragScopeProps extends Pick<
  DragDropContextOptions,
  'onDragStart' | 'onDragMove' | 'onDragEnd'
> {
  children: ElementNode
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
  children: ElementNode
}

/** A drop target in the current scope. */
export interface DragTargetProps {
  id: string
  children: ElementNode
}

/** A renderer's drag gesture scope, sources and targets. */
export interface DragDropRenderer {
  Scope: ComponentType<DragScopeProps>
  Source: ComponentType<DragSourceProps>
  Target: ComponentType<DragTargetProps>
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
