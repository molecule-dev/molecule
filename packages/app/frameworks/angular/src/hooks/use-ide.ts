/**
 * Angular functions for the IDE services, mirroring `useWorkspace`,
 * `useWorkspaceProvider`, `useEditor`, `useEditorProvider`, `usePreview` and
 * `usePreviewProvider` from `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, inject, type Signal, signal } from '@angular/core'

import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import type { PanelId, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { injectProvider } from '../inject.js'
import { EDITOR_PROVIDER, PREVIEW_PROVIDER, WORKSPACE_PROVIDER } from '../tokens.js'
import { useExternalStore } from './external-store.js'

/**
 * The workspace provider registered by `provideMolecule({ workspace })` or
 * `provideWorkspace`. Call it in an injection context.
 *
 * @returns The workspace provider.
 * @throws {Error} When no workspace provider is registered.
 */
export function useWorkspaceProvider(): WorkspaceProvider {
  return injectProvider(
    WORKSPACE_PROVIDER,
    'useWorkspaceOutsideProvider',
    'useWorkspaceProvider must be used within a WorkspaceProvider',
  )
}

/**
 * IDE workspace layout management. Call it in an injection context (a
 * component field initializer or constructor).
 *
 * @returns The workspace state as signals and the layout actions.
 */
export function useWorkspace(): {
  /** The current panel layout. */
  readonly layout: Signal<WorkspaceState['layout']>
  /** The active panel id, or `null`. */
  readonly activePanel: Signal<WorkspaceState['activePanel']>
  /** The collapsed panel ids. */
  readonly collapsedPanels: Signal<WorkspaceState['collapsedPanels']>
  /**
   * Shows or hides one panel.
   *
   * @param panelId - The panel to toggle.
   */
  togglePanel: (panelId: PanelId) => void
  /**
   * Rewrites one panel's size.
   *
   * @param panelId - The panel to resize.
   * @param size - The new size.
   */
  resizePanel: (panelId: PanelId, size: number) => void
  /**
   * Sets the active panel.
   *
   * @param panelId - The panel to activate.
   */
  setActivePanel: (panelId: PanelId) => void
  /** Restores the default layout. */
  resetLayout: () => void
} {
  const provider = useWorkspaceProvider()

  // Snapshot cache: a bond without getState builds its answers fresh, and the
  // emitted state is cached here so the read after a notification returns the
  // emitted object (React's cachedRef).
  let cached: WorkspaceState | null = null

  const read = (): WorkspaceState => {
    // A bond with getState answers with the full state, the same object until it changes.
    const full = provider.getState?.()
    if (full) return full
    const layout = provider.getLayout()
    // Without getState, only the layout is readable before the first subscribe
    // callback; the rest starts at the core's initial values. Use a lightweight cache comparison.
    const prev = cached
    if (prev && prev.layout === layout) {
      return prev
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

  const state = useExternalStore(read, (onStoreChange) => {
    return provider.subscribe((next) => {
      cached = next
      onStoreChange()
    })
  })

  const togglePanel = (panelId: PanelId): void => provider.togglePanel(panelId)
  const resizePanel = (panelId: PanelId, size: number): void => provider.resizePanel(panelId, size)
  const setActivePanel = (panelId: PanelId): void => provider.setActivePanel(panelId)
  const resetLayout = (): void => provider.resetLayout()

  return {
    layout: computed(() => state().layout),
    activePanel: computed(() => state().activePanel),
    collapsedPanels: computed(() => state().collapsedPanels),
    togglePanel,
    resizePanel,
    setActivePanel,
    resetLayout,
  }
}

/**
 * The editor provider registered by `provideMolecule({ editor })` or
 * `provideEditor`. Call it in an injection context.
 *
 * @returns The editor provider.
 * @throws {Error} When no editor provider is registered.
 */
export function useEditorProvider(): EditorProvider {
  return injectProvider(
    EDITOR_PROVIDER,
    'useEditorOutsideProvider',
    'useEditorProvider must be used within an EditorProvider',
  )
}

/**
 * What {@link useEditor} returns: the tab list and active file as signals and
 * every editor action as a plain function.
 */
export interface UseEditorResult {
  /** The provider's tab list. */
  readonly tabs: Signal<EditorTab[]>
  /** The path of the active tab, or `null` when no tab is active. */
  readonly activeFile: Signal<string | null>
  /**
   * Opens a file (and makes it active).
   *
   * @param file - The file to open.
   */
  openFile: (file: EditorFile) => void
  /**
   * Closes a file's tab.
   *
   * @param path - The path to close.
   */
  closeFile: (path: string) => void
  /**
   * Reads the active tab's content.
   *
   * @returns The content, or `null` with no active tab.
   */
  getContent: () => string | null
  /**
   * Writes one tab's content.
   *
   * @param path - The tab's path.
   * @param content - The new content.
   */
  setContent: (path: string, content: string) => void
  /**
   * Activates one tab.
   *
   * @param path - The tab to activate.
   */
  setActiveTab: (path: string) => void
  /**
   * Mounts the editor into an element.
   *
   * @param element - The host element.
   * @param config - The editor config.
   * @returns Whatever the provider's mount returns.
   */
  mount: (...args: Parameters<EditorProvider['mount']>) => ReturnType<EditorProvider['mount']>
  /** Disposes the editor. */
  dispose: () => void
  /** Focuses the editor. */
  focus: () => void
  /**
   * Opens a diff tab.
   *
   * @param file - The diff to show.
   */
  openDiff: (file: DiffFile) => void
  /** Closes the diff tab. */
  closeDiff: () => void
  /**
   * Converts a preview tab into a normal one.
   *
   * @param path - The tab to pin.
   */
  pinTab: (path: string) => void
  /**
   * Adds a type definition file to the editor's language service.
   *
   * @param content - The declaration content.
   * @param filePath - The virtual file path.
   */
  addExtraLib: (content: string, filePath: string) => void
  /**
   * Subscribes to fix-with-AI requests.
   *
   * @param callback - Called for every request.
   * @returns A function that removes the subscription.
   */
  onFixWithAI: (callback: (request: FixWithAIRequest) => void) => () => void
}

/**
 * Code editor management. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * `tabs` and `activeFile` always come from the provider's own tab list:
 * `activeFile` is the path of the tab marked `isActive`, or `null` when no
 * tab is. They are read at mount (tabs opened before the component mounted
 * show at once), on every provider change event, and after each action that
 * changes the tab list (`openFile`, `closeFile`, `setActiveTab`, `openDiff`,
 * `closeDiff`, `pinTab`).
 *
 * @returns Editor state as signals and the editor actions.
 */
export function useEditor(): UseEditorResult {
  const provider = useEditorProvider()
  const destroyRef = inject(DestroyRef)

  const tabs = signal<EditorTab[]>(provider.getTabs())
  const activeFile = computed(() => tabs().find((tab) => tab.isActive)?.path ?? null)

  // Re-reads the provider's tab list, which also carries the active tab.
  const syncTabs = (): void => tabs.set(provider.getTabs())

  // Subscribe to changes to update tabs and active file. Read once on
  // subscribing too: a change between the first read and this subscription, or
  // a replaced provider, sends no event this subscription could see.
  const unsubscribe = provider.onChange(syncTabs)
  syncTabs()
  destroyRef.onDestroy(unsubscribe)

  const openFile = (file: EditorFile): void => {
    provider.openFile(file)
    syncTabs()
  }

  const closeFile = (path: string): void => {
    provider.closeFile(path)
    syncTabs()
  }

  const getContent = (): string | null => provider.getContent()

  const setContent = (path: string, content: string): void => provider.setContent(path, content)

  const setActiveTab = (path: string): void => {
    provider.setActiveTab(path)
    syncTabs()
  }

  const mount = (
    ...args: Parameters<EditorProvider['mount']>
  ): ReturnType<EditorProvider['mount']> => provider.mount(...args)

  const dispose = (): void => provider.dispose()
  const focus = (): void => provider.focus()

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

  const addExtraLib = (content: string, filePath: string): void => {
    provider.addExtraLib?.(content, filePath)
  }

  const onFixWithAI = (callback: (request: FixWithAIRequest) => void): (() => void) => {
    return provider.onFixWithAI?.(callback) ?? (() => {})
  }

  return {
    tabs: tabs.asReadonly(),
    activeFile,
    openFile,
    closeFile,
    getContent,
    setContent,
    setActiveTab,
    mount,
    dispose,
    focus,
    openDiff,
    closeDiff,
    pinTab,
    addExtraLib,
    onFixWithAI,
  }
}

/**
 * The preview provider registered by `provideMolecule({ preview })` or
 * `providePreview`. Call it in an injection context.
 *
 * @returns The preview provider.
 * @throws {Error} When no preview provider is registered.
 */
export function usePreviewProvider(): PreviewProvider {
  return injectProvider(
    PREVIEW_PROVIDER,
    'usePreviewOutsideProvider',
    'usePreviewProvider must be used within a PreviewProvider',
  )
}

/**
 * What {@link usePreview} returns: the preview state as a signal and every
 * preview action as a plain function.
 */
export interface UsePreviewResult {
  /** The preview state (url, device, connection, history flags). */
  readonly state: Signal<PreviewState>
  /**
   * Loads a new document.
   *
   * @param url - The url to load.
   */
  setUrl: (url: string) => void
  /** Reloads the current document. */
  refresh: () => void
  /**
   * Switches the device frame.
   *
   * @param device - The device frame to show.
   */
  setDevice: (device: DeviceFrame) => void
  /** Opens the current url outside the preview. */
  openExternal: () => void
  /**
   * Records an in-app navigation without reloading.
   *
   * @param url - The displayed url.
   * @param isReplace - Whether the current history entry is replaced.
   */
  recordNavigation: (url: string, isReplace?: boolean) => void
  /** Goes back one navigation entry. */
  back: () => void
  /** Goes forward one navigation entry. */
  forward: () => void
}

/**
 * Live preview management. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * @returns The preview state as a signal and the preview actions.
 */
export function usePreview(): UsePreviewResult {
  const provider = usePreviewProvider()

  // Snapshot cache: a provider that builds its answers fresh keeps the
  // snapshot stable between notifications (React's cachedRef).
  let cached: PreviewState | null = null

  const read = (): PreviewState => {
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

  const state = useExternalStore(read, (onStoreChange) => {
    return provider.subscribe(() => onStoreChange())
  })

  const setUrl = (url: string): void => provider.setUrl(url)
  const refresh = (): void => provider.refresh()
  const setDevice = (device: DeviceFrame): void => provider.setDevice(device)
  const openExternal = (): void => provider.openExternal()
  const recordNavigation = (url: string, isReplace?: boolean): void =>
    provider.recordNavigation(url, isReplace)
  const back = (): void => provider.back()
  const forward = (): void => provider.forward()

  return { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward }
}
