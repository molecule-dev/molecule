/**
 * Default app-side bond wirings (React + Tailwind + React Router +
 * localStorage + Arimo font + Molecule icons).
 *
 * Centralizes 5 byte-identical `app/src/bonds/<name>.ts` setup
 * functions that every flagship app shipped. Per-app bond files
 * become 1-line re-exports — `bonds/index.ts` import sites unchanged.
 *
 * `setupAppStylingTailwind` is a no-op (Tailwind is configured via
 * env vars and the Vite plugin), retained for naming consistency
 * so apps can wire it in `setupProviders()` alongside the others.
 *
 * @module
 */

import { setFont } from '@molecule/app-fonts'
import { font as arimoFont } from '@molecule/app-fonts-arimo'
import { setIconSet } from '@molecule/app-icons'
import { iconSet as moleculeIconSet } from '@molecule/app-icons-molecule'
import { setRouter } from '@molecule/app-routing'
import { provider as reactRouterProvider } from '@molecule/app-routing-react-router'
import { setProvider as setStorage } from '@molecule/app-storage'
import { provider as localStorageProvider } from '@molecule/app-storage-localstorage'

/** Wires `@molecule/app-fonts-arimo` to `@molecule/app-fonts`. */
export function setupAppFontsArimo(): void {
  setFont(arimoFont)
}

/** Wires `@molecule/app-icons-molecule` to `@molecule/app-icons`. */
export function setupAppIconsMolecule(): void {
  setIconSet(moleculeIconSet)
}

/** Wires `@molecule/app-routing-react-router` to `@molecule/app-routing`. */
export function setupAppRoutingReactRouter(): void {
  setRouter(reactRouterProvider)
}

/** Wires `@molecule/app-storage-localstorage` to `@molecule/app-storage`. */
export function setupAppStorageLocalstorage(): void {
  setStorage(localStorageProvider)
}

/**
 * No-op wiring for `@molecule/app-styling-tailwind` — Tailwind is
 * configured via env vars and the Vite plugin rather than runtime
 * provider injection. Retained so `bonds/index.ts` `setupProviders()`
 * can call it alongside the other defaults without exceptions.
 */
export function setupAppStylingTailwind(): void {
  // No explicit setup needed — configured via environment variables.
}
