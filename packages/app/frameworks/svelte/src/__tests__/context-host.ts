/**
 * Typed mounting under the molecule Svelte context: the component under test is
 * rendered inside {@link ContextHost}, which provides the case's services
 * through `setMoleculeContext` exactly as an app's root layout does, and its
 * props are checked against that component's own props type.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'

import type { MoleculeConfig } from '../types.js'
import ContextHost from './ContextHost.svelte'

/** The props {@link ContextHost} takes for one component's props. */
export interface ContextHostProps<Props extends Record<string, unknown>> {
  /** The services to provide through `setMoleculeContext`. */
  config: MoleculeConfig
  /** The component rendered under that context. */
  component: Component<Props>
  /** The component's props. */
  props: Props
}

/** A tree mounted under the molecule context. */
export interface MountedContextTree {
  /** The container the tree was mounted into. */
  container: HTMLDivElement
  /** Unmounts the tree once and removes the container. */
  stop: () => Promise<void>
}

/**
 * Mounts a component under the molecule context.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param component - The component to render under that context.
 * @param props - The component's props.
 * @param target - Where the tree's container goes; the document body by default.
 * @returns The container and the unmount.
 */
export function mountInContext<Props extends Record<string, unknown>>(
  config: MoleculeConfig,
  component: Component<Props>,
  props: Props,
  target: HTMLElement = document.body,
): MountedContextTree {
  const container = document.createElement('div')
  target.appendChild(container)
  // The type arguments are explicit because `mount` infers a component's props from
  // the component itself, and this host's props vary with `Props`; pinning them keeps
  // `component` and `props` checked against each other. The host exports nothing.
  const app = mount<ContextHostProps<Props>, Record<never, never>>(ContextHost, {
    target: container,
    props: { config, component, props },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  return { container, stop }
}
