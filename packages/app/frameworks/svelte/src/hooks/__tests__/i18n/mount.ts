/**
 * Mounting helpers the i18n probe tests share: a component mounted under a
 * context carrying the i18n provider, provided through `setMoleculeContext`
 * exactly as an app's root layout does.
 *
 * @module
 */

import { type Component, flushSync } from 'svelte'

import type { I18nProvider } from '@molecule/app-i18n'

import { mountInContext } from '../../../__tests__/context-host.js'

/** A tree mounted under an i18n provider. */
export interface MountedTree {
  /** The container the tree was mounted into. */
  container: HTMLDivElement
  /** Unmounts the tree once (React's `unmount`). */
  stop: () => Promise<void>
}

/** The trees {@link mountUnder} mounted, torn down by {@link cleanupMounted}. */
const mounted: MountedTree[] = []

/**
 * Mounts a component under a context carrying the i18n provider.
 *
 * @param provider - The provider the component's `useT()`/`useTranslation()` reads.
 * @param component - The component to mount.
 * @param props - The component's props.
 * @returns The container and the unmount.
 */
export function mountUnder<Props extends Record<string, unknown>>(
  provider: I18nProvider,
  component: Component<Props>,
  props: Props,
): MountedTree {
  const tree = mountInContext({ i18n: provider }, component, props)
  let stopped = false
  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await tree.stop()
  }
  const mountedTree: MountedTree = { container: tree.container, stop }
  mounted.push(mountedTree)
  return mountedTree
}

/**
 * Tears down every tree the current test mounted and clears the document.
 *
 * @returns A promise settled once every tree is unmounted.
 */
export async function cleanupMounted(): Promise<void> {
  for (const tree of mounted.splice(0)) await tree.stop()
  document.body.innerHTML = ''
}

/**
 * Lets a settled promise chain and Svelte's pending updates run.
 *
 * @returns A promise settled after the update flush.
 */
export async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/**
 * The rendered text of the element carrying a `data-testid`.
 *
 * @param testId - The test id to read.
 * @returns The element's text content, or null when it is absent.
 */
export function textOf(testId: string): string | null | undefined {
  return document.querySelector(`[data-testid="${testId}"]`)?.textContent
}
