/**
 * Svelte hook for code editor management, porting React's `useEditor`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'

import { useEditorProvider } from '../context.js'

/**
 * Hook result for useEditor: the tab state as readable stores and the editor
 * actions as plain functions.
 */
export interface UseEditorResult {
  /** The provider's open tabs. */
  tabs: Readable<EditorTab[]>
  /** The path of the tab marked active, or null when none is. */
  activeFile: Readable<string | null>
  /** Opens a file in a tab and activates it. */
  openFile: (file: EditorFile) => void
  /** Closes a tab. */
  closeFile: (path: string) => void
  /** The active tab's content. */
  getContent: () => string | null
  /** Writes a tab's content. */
  setContent: (path: string, content: string) => void
  /** Activates the tab with the given path. */
  setActiveTab: (path: string) => void
  /** Mounts the editor into an element. */
  mount: EditorProvider['mount']
  /** Disposes the editor. */
  dispose: () => void
  /** Focuses the editor. */
  focus: () => void
  /** Opens a diff tab (provider optional method). */
  openDiff: (file: DiffFile) => void
  /** Closes the diff tab (provider optional method). */
  closeDiff: () => void
  /** Converts a preview tab into a normal one (provider optional method). */
  pinTab: (path: string) => void
  /** Adds an extra type library (provider optional method). */
  addExtraLib: (content: string, filePath: string) => void
  /** Subscribes a Fix-with-AI request listener; returns its unsubscribe. */
  onFixWithAI: (callback: (request: FixWithAIRequest) => void) => () => void
}

/**
 * Code editor management, React's `useEditor` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ editor })`.
 *
 * `tabs` and `activeFile` always come from the provider's own tab list:
 * `activeFile` is the path of the tab marked `isActive`, or `null` when no
 * tab is. They are read at mount (tabs opened before the component mounted
 * show at once), on every provider change event, and after each action that
 * changes the tab list (`openFile`, `closeFile`, `setActiveTab`, `openDiff`,
 * `closeDiff`, `pinTab`).
 *
 * @returns Editor state stores and controls.
 * @example
 * ```svelte
 * <script>
 *   import { useEditor } from '@molecule/app-svelte'
 *   const { tabs, activeFile, openFile } = useEditor()
 * </script>
 * ```
 */
export function useEditor(): UseEditorResult {
  const provider: EditorProvider = useEditorProvider()
  const tabs = writable<EditorTab[]>(provider.getTabs())
  const activeFile = derived(tabs, (list) => list.find((tab) => tab.isActive)?.path ?? null)

  // Re-reads the provider's tab list, which also carries the active tab.
  const syncTabs = (): void => {
    tabs.set(provider.getTabs())
  }

  // Subscribe to changes to update tabs and active file. Read once on
  // subscribing too: a change between the first read and this subscription,
  // or a replaced provider, sends no event this subscription could see.
  onDestroy(provider.onChange(syncTabs))
  syncTabs()

  const openFile = (file: EditorFile): void => {
    provider.openFile(file)
    syncTabs()
  }

  const closeFile = (path: string): void => {
    provider.closeFile(path)
    syncTabs()
  }

  const setContent = (path: string, content: string): void => provider.setContent(path, content)

  const setActiveTab = (path: string): void => {
    provider.setActiveTab(path)
    syncTabs()
  }

  const openDiff = (file: DiffFile): void => {
    provider.openDiff?.(file)
    syncTabs()
  }
  const closeDiff = (): void => {
    provider.closeDiff?.()
    syncTabs()
  }

  const pinTab = (path: string): void => {
    provider.pinTab?.(path)
    syncTabs()
  }

  return {
    tabs: { subscribe: tabs.subscribe },
    activeFile,
    openFile,
    closeFile,
    getContent: () => provider.getContent(),
    setContent,
    setActiveTab,
    mount: (...args: Parameters<EditorProvider['mount']>) => provider.mount(...args),
    dispose: () => provider.dispose(),
    focus: () => provider.focus(),
    openDiff,
    closeDiff,
    pinTab,
    addExtraLib: (content: string, filePath: string) => {
      provider.addExtraLib?.(content, filePath)
    },
    onFixWithAI: (callback: (request: FixWithAIRequest) => void) =>
      provider.onFixWithAI?.(callback) ?? (() => {}),
  }
}
