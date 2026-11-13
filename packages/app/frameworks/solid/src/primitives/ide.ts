/**
 * Solid primitives for the IDE services (workspace, code editor, live
 * preview), under React's hook names.
 *
 * @module
 */

import { type Accessor, createSignal, onCleanup, useContext } from 'solid-js'

import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import { t } from '@molecule/app-i18n'
import type { PanelId, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { EditorContext, PreviewContext, WorkspaceContext } from '../context.js'
import { useSyncExternalStore } from './external-store.js'

/**
 * The workspace provider from the nearest `MoleculeProvider`
 * (`config.workspace`), under React's hook name.
 *
 * @returns The workspace provider instance.
 * @throws {Error} When no `MoleculeProvider` above configures `workspace`.
 */
export function useWorkspaceProvider(): WorkspaceProvider {
  const provider = useContext(WorkspaceContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useWorkspaceOutsideProvider', undefined, {
        defaultValue: 'useWorkspaceProvider must be used within a WorkspaceProvider',
      }),
    )
  }
  return provider
}

/**
 * What {@link useWorkspace} returns: the layout fields as accessors and the
 * layout actions as plain functions (the same names React returns).
 */
export interface UseWorkspaceResult {
  /** The panel layout as an accessor. */
  layout: Accessor<WorkspaceState['layout']>
  /** The active panel id as an accessor. */
  activePanel: Accessor<PanelId | null>
  /** The collapsed panels as an accessor. */
  collapsedPanels: Accessor<Set<PanelId>>
  togglePanel: (panelId: PanelId) => void
  resizePanel: (panelId: PanelId, size: number) => void
  setActivePanel: (panelId: PanelId) => void
  resetLayout: () => void
}

/**
 * IDE workspace layout management, under React's hook name.
 *
 * @returns The workspace state as accessors and the layout actions.
 * @throws {Error} When no `MoleculeProvider` above configures `workspace`.
 */
export function useWorkspace(): UseWorkspaceResult {
  const provider = useWorkspaceProvider()

  let cached: WorkspaceState | null = null

  const getSnapshot = (): WorkspaceState => {
    // A bond with getState answers with the full state, the same object until it changes.
    const full = provider.getState?.()
    if (full) return full
    const layout = provider.getLayout()
    // Without getState, only the layout is readable before the first subscribe
    // callback; the rest starts at the core's initial values. Use a lightweight
    // cache comparison.
    if (cached && cached.layout === layout) {
      return cached
    }
    const next: WorkspaceState = {
      layout,
      activePanel: null,
      collapsedPanels: new Set(),
      isFullscreen: false,
    }
    cached = next
    return next
  }

  const state = useSyncExternalStore((onStoreChange) => {
    return provider.subscribe((next) => {
      cached = next
      onStoreChange()
    })
  }, getSnapshot)

  return {
    layout: () => state().layout,
    activePanel: () => state().activePanel,
    collapsedPanels: () => state().collapsedPanels,
    togglePanel: (panelId: PanelId) => provider.togglePanel(panelId),
    resizePanel: (panelId: PanelId, size: number) => provider.resizePanel(panelId, size),
    setActivePanel: (panelId: PanelId) => provider.setActivePanel(panelId),
    resetLayout: () => provider.resetLayout(),
  }
}

/**
 * The code editor provider from the nearest `MoleculeProvider`
 * (`config.editor`), under React's hook name.
 *
 * @returns The editor provider instance.
 * @throws {Error} When no `MoleculeProvider` above configures `editor`.
 */
export function useEditorProvider(): EditorProvider {
  const provider = useContext(EditorContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useEditorOutsideProvider', undefined, {
        defaultValue: 'useEditorProvider must be used within an EditorProvider',
      }),
    )
  }
  return provider
}

/**
 * What {@link useEditor} returns: the tab fields as accessors and the editor
 * controls as plain functions (the same names React returns).
 */
export interface UseEditorResult {
  /** The provider's tab list, as an accessor. */
  tabs: Accessor<EditorTab[]>
  /** The active tab's path (null when no tab is active), as an accessor. */
  activeFile: Accessor<string | null>
  openFile: (file: EditorFile) => void
  closeFile: (path: string) => void
  getContent: () => string | null
  setContent: (path: string, content: string) => void
  setActiveTab: (path: string) => void
  mount: EditorProvider['mount']
  dispose: () => void
  focus: () => void
  openDiff: (file: DiffFile) => void
  closeDiff: () => void
  pinTab: (path: string) => void
  addExtraLib: (content: string, filePath: string) => void
  onFixWithAI: (callback: (request: FixWithAIRequest) => void) => () => void
}

/**
 * Code editor management, under React's hook name.
 *
 * `tabs` and `activeFile` always come from the provider's own tab list, read
 * at mount, on every provider change event, and after each action that
 * changes the tab list.
 *
 * @returns Editor state (tabs, activeFile as accessors) and the controls.
 * @throws {Error} When no `MoleculeProvider` above configures `editor`.
 */
export function useEditor(): UseEditorResult {
  const provider = useEditorProvider()
  const [tabs, setTabs] = createSignal<EditorTab[]>(provider.getTabs())

  // Re-reads the provider's tab list, which also carries the active tab.
  const syncTabs = (): void => {
    setTabs(() => provider.getTabs())
  }

  // Subscribe to changes; read once on subscribing too (a change between the
  // first read and this subscription sends no event).
  const unsubscribe = provider.onChange(syncTabs)
  syncTabs()
  onCleanup(unsubscribe)

  const openFile = (file: EditorFile): void => {
    provider.openFile(file)
    syncTabs()
  }

  const closeFile = (path: string): void => {
    provider.closeFile(path)
    syncTabs()
  }

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
    tabs,
    activeFile: () => tabs().find((tab) => tab.isActive)?.path ?? null,
    openFile,
    closeFile,
    getContent: () => provider.getContent(),
    setContent: (path: string, content: string) => provider.setContent(path, content),
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
    onFixWithAI: (callback: (request: FixWithAIRequest) => void) => {
      return provider.onFixWithAI?.(callback) ?? (() => {})
    },
  }
}

/**
 * The live preview provider from the nearest `MoleculeProvider`
 * (`config.preview`), under React's hook name.
 *
 * @returns The preview provider instance.
 * @throws {Error} When no `MoleculeProvider` above configures `preview`.
 */
export function usePreviewProvider(): PreviewProvider {
  const provider = useContext(PreviewContext)
  if (!provider) {
    throw new Error(
      t('solid.error.usePreviewOutsideProvider', undefined, {
        defaultValue: 'usePreviewProvider must be used within a PreviewProvider',
      }),
    )
  }
  return provider
}

/**
 * What {@link usePreview} returns: the state as an accessor and the preview
 * controls as plain functions (the same names React returns).
 */
export interface UsePreviewResult {
  /** The preview state as an accessor. */
  state: Accessor<PreviewState>
  setUrl: (url: string) => void
  refresh: () => void
  setDevice: (device: DeviceFrame) => void
  openExternal: () => void
  /** Records a navigation the running preview reported. */
  recordNavigation: (url: string, isReplace?: boolean) => void
  /** Navigates the preview to the previous history entry (Back). */
  back: () => void
  /** Navigates the preview to the next history entry (Forward). */
  forward: () => void
}

/**
 * Live preview management, under React's hook name.
 *
 * @returns The preview state as an accessor and the controls.
 * @throws {Error} When no `MoleculeProvider` above configures `preview`.
 */
export function usePreview(): UsePreviewResult {
  const provider = usePreviewProvider()

  let cached: PreviewState | null = null

  const getSnapshot = (): PreviewState => {
    const next = provider.getState()
    const prev = cached
    if (
      prev &&
      prev.url === next.url &&
      prev.currentUrl === next.currentUrl &&
      prev.isLoading === next.isLoading &&
      prev.device === next.device &&
      prev.error === next.error &&
      prev.isConnected === next.isConnected &&
      prev.canGoBack === next.canGoBack &&
      prev.canGoForward === next.canGoForward &&
      prev.loadNonce === next.loadNonce
    ) {
      return prev
    }
    cached = next
    return next
  }

  const state = useSyncExternalStore((onStoreChange) => {
    return provider.subscribe(() => onStoreChange())
  }, getSnapshot)

  return {
    state,
    setUrl: (url: string) => provider.setUrl(url),
    refresh: () => provider.refresh(),
    setDevice: (device: DeviceFrame) => provider.setDevice(device),
    openExternal: () => provider.openExternal(),
    recordNavigation: (url: string, isReplace?: boolean) =>
      provider.recordNavigation(url, isReplace),
    back: () => provider.back(),
    forward: () => provider.forward(),
  }
}
