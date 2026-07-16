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
 * @e2e
 * Integration checklist — drive the real rendered UI (live preview, no mocks):
 * `navigate_preview` to the IDE, `read_preview_ui` to snapshot the panel
 * regions, `interact_preview` to drag dividers and toggle panels. Adapt each
 * item to this app's actual panels/layout and check every box off one by one.
 * A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The IDE renders its panel regions in the default layout — snapshot the
 *   preview and confirm each visible panel the app configures (e.g. a left
 *   sidebar/files, a center editor, a right preview, a bottom terminal) is
 *   present and laid out, none overlapping or collapsed to nothing.
 * - [ ] Dragging a divider between two panels resizes the adjacent panels and
 *   the sizes update live — grab the handle, drag, and confirm in a fresh
 *   snapshot that both neighbors changed size (not the whole window, no
 *   snap-back to the previous sizes).
 * - [ ] Toggling a panel's visibility (hide the terminal or the sidebar via its
 *   control) removes it from the layout, and toggling again restores it in the
 *   same position — the neighbors reflow to fill, they don't leave a blank gap.
 * - [ ] Collapsing a collapsible panel shrinks it out of the way and expanding
 *   restores its prior size; clicking into a panel updates the active-panel
 *   state (its highlight/toolbar follows the panel you focus).
 * - [ ] A resized / collapsed / hidden layout PERSISTS across a full reload —
 *   after reload the panels return at the sizes and visibility you left them,
 *   not reset to the default layout (the default bond persists to browser
 *   storage).
 * - [ ] A panel's minimum size is respected — dragging a divider to the far end
 *   cannot shrink a resizable panel to zero or an unusable sliver; it stops at
 *   its configured min.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
