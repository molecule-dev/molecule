/**
 * IDE workspace core interface for molecule.dev.
 *
 * Framework-agnostic contract for multi-panel workspace layouts (chat,
 * editor, preview, terminal, …): panel visibility, sizing, active panel,
 * and layout persistence. Bond a provider (e.g. `@molecule/app-ide-default`,
 * which persists layout in browser storage) at startup; a framework binding
 * (e.g. `@molecule/app-ide-react`) renders the layout from this state.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-ide'
 * import { provider } from '@molecule/app-ide-default'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const workspace = requireProvider()
 * workspace.togglePanel('terminal')
 * const unsubscribe = workspace.subscribe((state) => renderLayout(state))
 * ```
 *
 * @remarks
 * - **This core manages layout STATE only — panels render via a framework
 *   binding** (React: `@molecule/app-ide-react`) or your own components reading
 *   `getLayout()` + `subscribe()`. Wire the bond before the workspace mounts.
 * - `subscribe()` returns an unsubscribe function — call it on teardown to avoid
 *   duplicate renders after remounts.
 * - `PanelId` accepts custom strings beyond the built-ins ('chat' | 'editor' |
 *   'preview' | 'terminal' | 'deploy' | 'files') — register custom panels in the
 *   layout rather than hardcoding a parallel layout system.
 * - Layout persistence is the provider's concern (the default bond uses browser
 *   storage) — never write layout state to `localStorage` yourself.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
