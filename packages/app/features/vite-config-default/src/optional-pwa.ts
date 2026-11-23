/**
 * `vite-plugin-pwa`, loaded only when it is installed.
 *
 * It is an optional peer: an app with a service worker installs it (with
 * `@molecule/app-pwa-default`, which registers the worker), and an app without one
 * installs neither it nor the ~200 build packages it brings (`workbox-build` and its
 * Babel and Rollup tree). The config builds the PWA plugins only when this resolved.
 *
 * @module
 */

import { createRequire } from 'node:module'

import type * as VitePwa from 'vite-plugin-pwa'

/** The `vite-plugin-pwa` module. */
export type VitePwaModule = typeof VitePwa

/**
 * Load `vite-plugin-pwa` when it resolves from this package.
 *
 * @param resolve - Resolves a module id the way Node does; throws `MODULE_NOT_FOUND` when absent.
 * @returns The module, or `undefined` when it is not installed. An installed copy that fails
 *   to load still throws.
 */
export async function loadVitePwa(
  resolve: (id: string) => string = createRequire(import.meta.url).resolve,
): Promise<VitePwaModule | undefined> {
  try {
    resolve('vite-plugin-pwa')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') return undefined
    throw error
  }
  return import('vite-plugin-pwa')
}

/** `vite-plugin-pwa`, or `undefined` when the app does not install it. */
export const vitePwa: VitePwaModule | undefined = await loadVitePwa()
