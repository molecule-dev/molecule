/**
 * `@molecule/app-ide-react` — React components for an AI-powered IDE
 * workspace: `WorkspaceLayout` (resizable panel row), `ChatPanel` (streaming
 * AI chat with tool-call cards, @ file mentions, / commands), `EditorPanel`
 * (tabbed Monaco editor), `PreviewPanel` (live-preview iframe with device
 * frames + crash/blank recovery), `FileExplorer`, `CommandPalette`,
 * `QuickOpen`, `TabBar`, plus `registerCustomEventCard()` for app-specific
 * chat cards and `useKeyboardShortcuts()`.
 *
 * @example
 * ```tsx
 * import { ChatPanel, EditorPanel, PreviewPanel, WorkspaceLayout } from '@molecule/app-ide-react'
 *
 * <WorkspaceLayout>
 *   <ChatPanel
 *     projectId="proj_abc123"
 *     onFileOpen={(path) => console.log('open', path)}
 *     onFileChange={(path, content) => console.log('changed', path, content.length)}
 *     onReadyToBuild={() => console.log('boot sandbox')}
 *   />
 *   <EditorPanel
 *     onActiveFileChange={(path) => console.log('active', path)}
 *     onFixWithAI={(req) => console.log('fix', req)}
 *   />
 *   <PreviewPanel onPreviewError={(errs) => console.error(errs)} />
 * </WorkspaceLayout>
 * ```
 *
 * @remarks
 * - The panels are hook-driven and THROW without provider wiring: wrap the
 *   tree in `@molecule/app-react`'s `WorkspaceProvider`, `EditorProvider`,
 *   `ChatProvider`, and `PreviewProvider` (or the umbrella
 *   `MoleculeProvider`), each wired to a bond — typically
 *   `@molecule/app-ide-default` (workspace/layout state + persistence),
 *   `@molecule/app-code-editor-monaco`, `@molecule/app-ai-chat-http`
 *   (streaming chat endpoint), and `@molecule/app-live-preview-iframe`.
 *   `ChatPanel` additionally needs the bonded HTTP client
 *   (`useHttpClient`) and `I18nProvider`; `getClassMap()` needs a ClassMap
 *   bond.
 * - `WorkspaceLayout` takes panels as CHILDREN and matches them in order to
 *   the workspace provider's panel configs (extra configs are ignored, so
 *   rendering 2 children against the default 3-panel layout works). Panel
 *   sizes persist through the workspace provider's `resizePanel`.
 * - App-specific chat/stream events do NOT belong in this package — emit
 *   `{ type: 'custom', name, data }` events and register a card with
 *   `registerCustomEventCard(name, factory)` in the consuming app.
 * - `ReportModal` and `ShareModal` are exported so a HOST can mount them
 *   itself. They need only `projectId` + the bonded HTTP client — no
 *   workspace/editor/preview provider, no chat, no running sandbox — because
 *   they POST to `/projects/:id/report` and `/projects/:id/shares` on the
 *   platform API. Do NOT route a host's "report a bug" / "share" button
 *   through `ChatPanel`'s `openReportSignal` / `openShareSignal` alone: those
 *   props are observed inside the panel, so in any phase where the host does
 *   not mount a `ChatPanel` (a hibernating sandbox, an error screen) the
 *   button silently does nothing. Mount the modal directly in those phases.
 *   `ChatPanel` renders its own copies for `/report` and `/share`; a host that
 *   mounts them too must gate on whether the panel is mounted so the modal
 *   never opens twice.
 * - `ReportModal` does NOT show its own success state — it calls `onSubmitted`
 *   and closes, so a host that mounts it MUST surface the confirmation itself
 *   (`formatReportConfirmation(result)` returns the i18n key + default copy,
 *   and `result.url` is the filed issue). `ShareModal` does show the created
 *   link inline, but only until it is closed.
 * - Chat timestamps are a PER-DEVICE preference in localStorage, OFF by
 *   default — not a `ChatPanel` prop or project setting. Off, only the user's
 *   own message headers and critical events show a time; on, every message and
 *   event card does. Labels are minute-precise at every age ("3 minutes ago",
 *   then "9:25 AM", then "Sep 12, 9:25 AM") and advance each minute; a run of
 *   items with the same label shows it once, at the top, so only same-minute
 *   runs collapse. A host settings screen
 *   toggles it with `setChatTimestampsVisible(bool)` and reads it with
 *   `useChatTimestampsVisible()`; `/timestamps [on | off]` writes the same value.
 * - A custom card is a critical event only when its factory sets
 *   `critical: true` (a failure, a blocked action, a limit that stopped work) —
 *   the package never infers it from tone or copy.
 * - `ChatPanel` owns no pricing or auth routes, so every limit/upgrade button
 *   comes from the host's `buildUpgradeCta(context)`. The context forwards the
 *   backend's whole description of the refusal: `requiresSignup`, `limitType`
 *   (the rule that fired), `billingAction` (the remedy it resolved — e.g.
 *   `add_funds`, `add_payment_method`, `raise_spend_cap`, `upgrade`, `none`) and
 *   `upgradeTier` (`null` = no higher plan). Branch on `billingAction` first;
 *   every field is optional, so keep a fallback. A live limit banner and a
 *   recorded card that declares the same `coversLimitType` state one fact, so
 *   the card steps aside while the banner is up — which only reads as one
 *   consistent message if the banner's button is resolved from the same
 *   `billingAction` the card used.
 * - The **Tests bar** (`TestsBar`, rendered by `ChatPanel` directly above the
 *   uncommitted-files bar) lists the project's tests and runs them. It owns no
 *   routes: pass `listTests` and `runTests` and the bar appears; omit either and
 *   it does not render at all. `runTests(selection, onEvent)` returns a handle
 *   whose `cancel()` must really stop the run, and it must deliver exactly one
 *   `done` event however the run ends — including when the request never opened
 *   — or the bar spins forever. `canRunTests` (a viewer: false) and
 *   `testsAvailable` (the environment is up) each disable the run controls and
 *   state their own reason in the bar rather than failing on click; with
 *   `testsAvailable: false` the bar does not even ask `listTests`, so whatever
 *   was last listed stays readable. The bar re-lists on every `gitStatusTick`
 *   change and after each run, so a spec the agent just wrote appears with no
 *   reload.
 * - **End-to-end specs are meant to run against the LIVE PREVIEW.** The host
 *   should drive them through `@molecule/app-e2e-preview` (what every
 *   `mlcl create` app already bonds in `e2e/bonds.ts`), not a browser binary —
 *   in a sandbox there is none. That bond drives the page the person is
 *   actually looking at, so **a preview must be open somewhere** or the driver
 *   waits and fails; the bar says so next to the end-to-end group.
 * - Text routes through `t('ide.*')` — `@molecule/app-locales-ide` supplies
 *   translations.
 *
 * @module
 */

export * from './command-metadata.js'
export * from './components/index.js'
export * from './customEventCards.js'
export * from './hooks/index.js'
export * from './settings-metadata.js'
export type * from './types.js'
