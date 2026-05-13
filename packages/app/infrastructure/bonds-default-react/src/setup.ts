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
import { setProvider as setTheme } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

/**
 * Pre-wired default CSS-variables theme provider with light + dark
 * themes from `@molecule/app-theme-css-variables`. Apps that need
 * custom themes should build their own provider and skip this.
 *
 * Lazily constructed on first access — `createCSSVariablesThemeProvider`
 * touches `globalThis.localStorage.getItem` during construction, which
 * throws in non-DOM environments (SSR, unit-test runners with
 * incomplete localStorage shims).
 */
let _defaultThemeProvider: ReturnType<typeof createCSSVariablesThemeProvider> | null = null
export function getDefaultThemeProvider(): ReturnType<typeof createCSSVariablesThemeProvider> {
  if (!_defaultThemeProvider) {
    _defaultThemeProvider = createCSSVariablesThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
      persistKey: 'molecule-theme',
    })
  }
  return _defaultThemeProvider
}

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

/** Wires the default light + dark CSS-variables theme provider to `@molecule/app-theme`. */
export function setupAppThemeCssVariables(): void {
  setTheme(getDefaultThemeProvider())
}

/** Wires `@molecule/app-ui-tailwind` `classMap` to `@molecule/app-ui`. */
export function setupAppUiTailwind(): void {
  setClassMap(classMap)
}

/** Wires `@molecule/app-realtime-socketio` to `@molecule/app-realtime`. */
export async function setupAppRealtimeSocketio(): Promise<void> {
  const [{ setProvider: setRealtime }, { provider }] = await Promise.all([
    import('@molecule/app-realtime'),
    import('@molecule/app-realtime-socketio'),
  ])
  setRealtime(provider)
}

/** Wires `@molecule/app-keyboard-shortcuts-hotkeys` to `@molecule/app-keyboard-shortcuts`. */
export async function setupAppKeyboardShortcutsHotkeys(): Promise<void> {
  const [{ setProvider: setKbd }, { provider }] = await Promise.all([
    import('@molecule/app-keyboard-shortcuts'),
    import('@molecule/app-keyboard-shortcuts-hotkeys'),
  ])
  setKbd(provider)
}

/** Wires `@molecule/app-command-palette-cmdk` to `@molecule/app-command-palette`. */
export async function setupAppCommandPaletteCmdk(): Promise<void> {
  const [{ setProvider: setPalette }, { provider }] = await Promise.all([
    import('@molecule/app-command-palette'),
    import('@molecule/app-command-palette-cmdk'),
  ])
  setPalette(provider)
}

/** Wires `@molecule/app-code-editor-monaco` to `@molecule/app-code-editor`. */
export async function setupAppCodeEditorMonaco(): Promise<void> {
  const [{ setProvider: setEditor }, { provider }] = await Promise.all([
    import('@molecule/app-code-editor'),
    import('@molecule/app-code-editor-monaco'),
  ])
  setEditor(provider)
}

/** Wires `@molecule/app-virtual-scroll-tanstack` to `@molecule/app-virtual-scroll`. */
export async function setupAppVirtualScrollTanstack(): Promise<void> {
  const [{ setProvider: setScroll }, { provider }] = await Promise.all([
    import('@molecule/app-virtual-scroll'),
    import('@molecule/app-virtual-scroll-tanstack'),
  ])
  setScroll(provider)
}

/** Wires `@molecule/app-drag-drop-dndkit` to `@molecule/app-drag-drop`. */
export async function setupAppDragDropDndkit(): Promise<void> {
  const [{ setProvider: setDnd }, { provider }] = await Promise.all([
    import('@molecule/app-drag-drop'),
    import('@molecule/app-drag-drop-dndkit'),
  ])
  setDnd(provider)
}

/**
 * Wires all 7 universal app-side bonds in one call — fonts, routing,
 * storage, styling, theme, UI ClassMap, icons (in that order). Auth
 * + i18n stay per-app because they need app-specific config.
 *
 * Replaces 9 individual setupX() calls in per-app `bonds/index.ts`.
 */
export function setupAllDefaultBonds(): void {
  setupAppFontsArimo()
  setupAppRoutingReactRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
}
