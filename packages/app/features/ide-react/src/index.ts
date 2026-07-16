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
