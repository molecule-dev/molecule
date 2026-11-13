/**
 * The browser environment every binding case runs under.
 *
 * Each framework binding runs the kit from its own package, and an
 * auto-created web provider (device, platform) reads the page: the user agent,
 * the screen, the CPU count, `matchMedia`, `NODE_ENV` and
 * `npm_package_version`. Some of those differ by machine or by the package the
 * run starts from, so the runner pins them all to fixed values for every case
 * and restores them afterwards. A case that seeds its own values (the native
 * area's `platform.userAgent`, …) patches over the pinned ones.
 *
 * The bond registry is restored after each case too: a hook that finds no
 * provider bonded auto-creates and bonds a default (`device`, `push`,
 * `version`, …), and without the restore every later case would find that one
 * instead of an empty slot.
 *
 * @module
 */

import { registry } from '@molecule/app-bond'
import { resetPlatformCache } from '@molecule/app-platform'

/** The `navigator.userAgent` every case runs under unless it seeds its own. */
export const CONFORMANCE_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) ConformanceKit/1.0'

/**
 * Redefines an own property on an object and returns a function restoring the
 * previous state (an own property back, or the shadowed prototype lookup when
 * there was none).
 *
 * @param target - The object to patch (navigator, window, screen).
 * @param key - The property name.
 * @param value - The value to install.
 * @returns The restore function.
 */
export function patchProperty(target: object, key: string, value: unknown): () => void {
  const had = Object.prototype.hasOwnProperty.call(target, key)
  const previous = had ? Object.getOwnPropertyDescriptor(target, key) : undefined
  Object.defineProperty(target, key, { value, configurable: true, writable: true })
  return () => {
    if (previous) Object.defineProperty(target, key, previous)
    else delete (target as Record<string, unknown>)[key]
  }
}

/**
 * Sets `process.env[key]` (or removes it, for `undefined`) and returns a
 * function restoring it.
 *
 * @param key - The environment variable name.
 * @param value - The value to set, or `undefined` to remove it.
 * @returns The restore function.
 */
export function patchEnv(key: string, value: string | undefined): () => void {
  const env = process.env as Record<string, string | undefined>
  const had = key in env
  const previous = env[key]
  if (value === undefined) delete env[key]
  else env[key] = value
  return () => {
    if (had) env[key] = previous
    else delete env[key]
  }
}

/**
 * A `MediaQueryList` that matches nothing and never changes.
 *
 * @param media - The query.
 * @returns The list.
 */
function unmatchedMediaQuery(media: string): MediaQueryList {
  return {
    matches: false,
    media,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }
}

/**
 * Pins the page environment to fixed values: a desktop Linux browser with a
 * 1280×800 window and screen, pixel ratio 1, four CPU cores, English, online,
 * no matching media query, `NODE_ENV` `'test'` and no `npm_package_version`.
 *
 * @returns A function that restores everything it changed.
 */
export function pinBrowserEnvironment(): () => void {
  const restore: (() => void)[] = []
  if (typeof navigator !== 'undefined') {
    const fixed: Record<string, unknown> = {
      userAgent: CONFORMANCE_USER_AGENT,
      platform: 'Linux x86_64',
      product: 'Gecko',
      language: 'en-US',
      languages: ['en-US', 'en'],
      maxTouchPoints: 0,
      hardwareConcurrency: 4,
      onLine: true,
    }
    for (const [key, value] of Object.entries(fixed)) {
      restore.push(patchProperty(navigator, key, value))
    }
  }
  if (typeof window !== 'undefined') {
    restore.push(patchProperty(window, 'innerWidth', 1280))
    restore.push(patchProperty(window, 'innerHeight', 800))
    restore.push(patchProperty(window, 'devicePixelRatio', 1))
    restore.push(patchProperty(window, 'matchMedia', unmatchedMediaQuery))
    if (window.screen) {
      const screenValues: Record<string, unknown> = {
        width: 1280,
        height: 800,
        availWidth: 1280,
        availHeight: 800,
        colorDepth: 24,
        pixelDepth: 24,
        orientation: { type: 'landscape-primary', angle: 0 },
      }
      for (const [key, value] of Object.entries(screenValues)) {
        restore.push(patchProperty(window.screen, key, value))
      }
    }
  }
  if (typeof process !== 'undefined') {
    restore.push(patchEnv('NODE_ENV', 'test'))
    restore.push(patchEnv('npm_package_version', undefined))
  }
  // Platform detection caches what it read; read the pinned page instead.
  resetPlatformCache()
  return () => {
    for (const undo of restore.reverse()) undo()
    resetPlatformCache()
  }
}

/**
 * Records every bonded provider, singleton and named, and returns a function
 * that puts the registry back exactly as it was: providers bonded since are
 * removed and replaced ones restored.
 *
 * @returns The restore function.
 */
export function isolateBondRegistry(): () => void {
  const singletons = new Map(registry.singletons)
  const named = new Map([...registry.named].map(([type, byName]) => [type, new Map(byName)]))
  return () => {
    registry.singletons.clear()
    for (const [type, provider] of singletons) registry.singletons.set(type, provider)
    registry.named.clear()
    for (const [type, byName] of named) registry.named.set(type, new Map(byName))
  }
}
