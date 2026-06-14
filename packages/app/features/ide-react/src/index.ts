/**
 * `@molecule/app-ide-react` — React IDE components for an AI-powered workspace.
 *
 * @example
 * ```tsx
 * import { ChatPanel, EditorPanel, PreviewPanel, WorkspaceLayout } from '@molecule/app-ide-react'
 *
 * <WorkspaceLayout>
 *   <ChatPanel
 *     projectId="proj_abc123"
 *     onFileOpen={(path) => openTab(path)}
 *     onFileChange={(path, content) => refreshEditor(path, content)}
 *     onReadyToBuild={() => bootSandbox()}
 *   />
 *   <EditorPanel
 *     onActiveFileChange={(path) => setActiveFile(path)}
 *     onFixWithAI={(req) => sendFixRequest(req)}
 *   />
 *   <PreviewPanel onPreviewError={(errs) => console.error(errs)} />
 * </WorkspaceLayout>
 * ```
 * @module
 */

export * from './command-metadata.js'
export * from './components/index.js'
export * from './customEventCards.js'
export * from './hooks/index.js'
export * from './settings-metadata.js'
export type * from './types.js'
