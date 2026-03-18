/**
 * Monaco Editor implementation of EditorProvider.
 *
 * Uses the Monaco Editor (same editor as VS Code) for code editing
 * with TypeScript support, syntax highlighting, and IntelliSense.
 *
 * @module
 */

import type {
  DiffFile,
  EditorChangeEvent,
  EditorConfig,
  EditorDiagnostic,
  EditorFile,
  EditorPosition,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import { t } from '@molecule/app-i18n'

import {
  LspClient,
  type LspClientRef,
  type LspMonacoModule,
  type LspProviderOptions,
  registerLspProviders,
} from './lsp-client.js'
import { registerTsxHighlighting } from './tsx-monarch.js'
import type { MonacoConfig } from './types.js'

/** Minimal Monaco types to avoid importing the full package at compile time. */
interface MonacoEditor {
  dispose(): void
  getModel(): MonacoModel | null
  setModel(model: MonacoModel | null): void
  layout(dimensions?: { width: number; height: number }): void
  getPosition(): { lineNumber: number; column: number } | null
  setPosition(position: { lineNumber: number; column: number }): void
  revealLineInCenter(lineNumber: number): void
  focus(): void
  updateOptions(options: Record<string, unknown>): void
  onDidChangeModelContent(listener: () => void): { dispose(): void }
  addAction(descriptor: {
    id: string
    label: string
    contextMenuGroupId?: string
    contextMenuOrder?: number
    precondition?: string
    run: (editor: MonacoEditor) => void
  }): { dispose(): void }
  addCommand(keybinding: number, handler: (...args: unknown[]) => void): string | null
  getSelection(): {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  } | null
}

interface MonacoModel {
  getValue(): string
  setValue(value: string): void
  dispose(): void
  uri: unknown
  getLineContent(lineNumber: number): string
  getLineCount(): number
}

/** Minimal marker type from Monaco's marker service. */
interface MonacoMarker {
  owner: string
  severity: number // 1=Hint, 2=Info, 4=Warning, 8=Error
  message: string
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  source?: string
}

/** Minimal code action type returned by code action providers. */
interface MonacoCodeAction {
  title: string
  kind?: string
  diagnostics?: MonacoMarker[]
  isPreferred?: boolean
  command?: {
    id: string
    title: string
    arguments?: unknown[]
  }
}

interface MonacoDiffEditor {
  dispose(): void
  setModel(model: { original: MonacoModel; modified: MonacoModel }): void
  layout(dimensions?: { width: number; height: number }): void
}

interface MonacoLanguageDefaults {
  setCompilerOptions(options: Record<string, unknown>): void
  setDiagnosticsOptions(options: Record<string, unknown>): void
  setModeConfiguration?(options: Record<string, boolean>): void
  addExtraLib(content: string, filePath?: string): { dispose(): void }
}

interface MonacoModule {
  editor: {
    create(element: HTMLElement, options: Record<string, unknown>): MonacoEditor
    createDiffEditor(element: HTMLElement, options: Record<string, unknown>): MonacoDiffEditor
    createModel(value: string, language?: string, uri?: unknown): MonacoModel
    getModel(uri: unknown): MonacoModel | null
    getModelMarkers(filter: { resource?: unknown }): MonacoMarker[]
    setModelMarkers(model: MonacoModel, owner: string, markers: unknown[]): void
    onDidChangeMarkers(listener: (uris: unknown[]) => void): { dispose(): void }
    defineTheme(themeName: string, themeData: Record<string, unknown>): void
    registerEditorOpener?(opener: {
      openCodeEditor(
        source: unknown,
        resource: unknown,
        selectionOrPosition?: unknown,
      ): boolean | Promise<boolean>
    }): { dispose(): void }
  }
  Uri: {
    parse(uri: string): unknown
  }
  languages: {
    typescript: {
      typescriptDefaults: MonacoLanguageDefaults
      javascriptDefaults: MonacoLanguageDefaults
    }
    setMonarchTokensProvider(
      languageId: string,
      languageDef: Record<string, unknown>,
    ): { dispose(): void }
    registerCodeActionProvider(
      languageSelector: string,
      provider: {
        provideCodeActions(
          model: MonacoModel,
          range: unknown,
          context: { markers: MonacoMarker[] },
          token: unknown,
        ): { actions: MonacoCodeAction[]; dispose(): void }
      },
    ): { dispose(): void }
  }
  MarkerSeverity: {
    Hint: number
    Info: number
    Warning: number
    Error: number
  }
}

/**
 * Monaco Editor implementation of `EditorProvider`. Dynamically imports the Monaco Editor
 * library at runtime to avoid large bundle sizes. Manages multiple file tabs with
 * independent Monaco models, cursor tracking, and change event listeners.
 */
export class MonacoEditorProvider implements EditorProvider {
  readonly name = 'monaco'
  private config: MonacoConfig
  private monaco: MonacoModule | null = null
  private editor: MonacoEditor | null = null
  private monacoModels: Map<string, MonacoModel> = new Map()
  private fileContents: Map<string, { content: string; language?: string }> = new Map()
  private tabs: Map<string, EditorTab> = new Map()
  private activeFile: string | null = null
  private changeListeners: Set<(event: EditorChangeEvent) => void> = new Set()
  private changeDisposable: { dispose(): void } | null = null
  private versionCounter = 0
  /** Guard against re-entrant changeListeners.forEach() calls. */
  private notifying = false
  /** Timer for debounced marker-change notifications. */
  private markerNotifyTimer: ReturnType<typeof setTimeout> | null = null
  /** Incremented on each mount() call; continuations check this to cancel stale async mounts. */
  private mountGeneration = 0
  /** The DOM element the normal editor is mounted into (saved for diff toggle). */
  private containerElement: HTMLElement | null = null
  /** Active diff editor instance, if any. */
  private diffEditor: MonacoDiffEditor | null = null
  /** Models used by the diff editor (disposed when diff closes). */
  private diffModels: { original: MonacoModel; modified: MonacoModel } | null = null
  /** Container element created for the diff editor. */
  private diffContainerEl: HTMLElement | null = null
  /** Disposable for the onDidChangeMarkers listener. */
  private markerDisposable: { dispose(): void } | null = null
  /** Map of filePath → disposable for registered extra libs. */
  private extraLibDisposables: Map<string, { dispose(): void }> = new Map()
  /** Active LSP client for remote language intelligence. */
  private lspClient: LspClient | null = null
  /** Mutable ref read by LSP providers — swapped on reconnect without re-registration. */
  private lspClientRef: LspClientRef = { current: null }
  /** Disposable for LSP-registered Monaco language providers (registered once, never re-registered). */
  private lspProviders: { dispose(): void } | null = null
  /** Models created lazily by resolveModel (Peek Definition) — disposed on LSP disconnect. */
  private lspResolvedModels: MonacoModel[] = []
  /** Callback invoked when the LSP connection drops unexpectedly. */
  private onLspDisconnectCb: (() => void) | null = null
  /** LSP document version counters keyed by file path. */
  private documentVersions: Map<string, number> = new Map()
  /** Callback to fetch file content by path — used for Go to Definition cross-file navigation. */
  private fileResolver:
    | ((path: string) => Promise<{ content: string; language?: string } | null>)
    | null = null
  /** Disposable for the editor opener registration. */
  private editorOpenerDisposable: { dispose(): void } | null = null
  /** Callbacks for "Fix with AI" requests from the editor. */
  private fixWithAIListeners: Set<(request: FixWithAIRequest) => void> = new Set()
  /** Disposables for Fix with AI registrations (code action provider + context menu action). */
  private fixWithAIDisposables: { dispose(): void }[] = []

  constructor(config: MonacoConfig = {}) {
    this.config = {
      theme: config.theme,
      fontFamily: config.fontFamily ?? "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: config.fontSize ?? 12,
      tabSize: config.tabSize ?? 2,
      wordWrap: config.wordWrap ?? false,
      minimap: config.minimap ?? true,
      ...config,
    }
  }

  /**
   * Mounts the Monaco Editor into a DOM element. Dynamically imports the `monaco-editor` package.
   * Uses a generation counter to cancel stale async continuations from React StrictMode's
   * double-mount behaviour.
   * @param element - The HTML element to mount the editor into.
   * @param config - Optional editor configuration merged with constructor defaults.
   */
  async mount(element: HTMLElement, config?: EditorConfig): Promise<void> {
    const generation = ++this.mountGeneration
    const mergedConfig = { ...this.config, ...config }

    // Dynamic import — Monaco is a large library, loaded at runtime.
    // Must use a string literal (not a variable) so Vite can rewrite the bare specifier
    // 'monaco-editor' to the resolved node_modules path at dev-serve time.
    const monaco = (await import('monaco-editor')) as unknown as MonacoModule

    // If a newer mount() call started while we were awaiting, bail out.
    // This handles React StrictMode's double-invoke of useEffect.
    if (generation !== this.mountGeneration) return

    this.monaco = monaco
    this.containerElement = element

    // Configure Monaco workers for language services.
    // Only set if not already configured (avoids overwriting on re-mounts).
    // Workers must be module type since Monaco's ESM worker files use `import`.
    // Vite dev server serves node_modules with fs.strict=false so these paths work.
    const win = window as unknown as Record<string, unknown>
    if (!win.MonacoEnvironment) {
      win.MonacoEnvironment = {
        // Use new URL(..., import.meta.url) so Vite resolves bare specifiers
        // through its module resolver (finds hoisted workspace node_modules).
        // Hardcoded /node_modules/ paths fail in monorepo setups where node_modules
        // is at the workspace root, not the app root.
        getWorker(_moduleId: string, label: string): Worker {
          if (label === 'json') {
            return new Worker(
              new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
              { type: 'module' },
            )
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return new Worker(
              new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
              { type: 'module' },
            )
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new Worker(
              new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
              { type: 'module' },
            )
          }
          if (label === 'typescript' || label === 'javascript') {
            return new Worker(
              new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
              { type: 'module' },
            )
          }
          return new Worker(
            new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
            { type: 'module' },
          )
        },
      }
    }

    // Dispose previous editor if exists
    if (this.editor) {
      this.changeDisposable?.dispose()
      this.changeDisposable = null
      this.editor.dispose()
    }

    registerTsxHighlighting(monaco as Parameters<typeof registerTsxHighlighting>[0])

    this.editor = monaco.editor.create(element, {
      theme: mergedConfig.theme ?? 'molecule-dark',
      fontFamily: mergedConfig.fontFamily,
      fontSize: mergedConfig.fontSize ?? 14,
      tabSize: mergedConfig.tabSize ?? 2,
      wordWrap: mergedConfig.wordWrap ? 'on' : 'off',
      minimap: { enabled: mergedConfig.minimap ?? true },
      readOnly: mergedConfig.readOnly ?? false,
      automaticLayout: true,
      fixedOverflowWidgets: true,
    } as Record<string, unknown>)

    this.wireChangeListener()
    this.configureTypeScript(monaco)
    this.wireMarkerListener(monaco)
    this.registerEditorOpener(monaco)
    this.registerFixWithAI(monaco)
    console.debug('[Monaco] mount() complete, editor created', { activeFile: this.activeFile })

    // If we have an active file, create its model if needed (handles race condition
    // where openFile was called before mount completed), then set it
    if (this.activeFile) {
      try {
        let model = this.monacoModels.get(this.activeFile)
        if (!model) {
          const stored = this.fileContents.get(this.activeFile)
          if (stored) {
            const uri = this.monaco.Uri.parse(`file://${this.activeFile}`)
            const existing = this.monaco.editor.getModel(uri)
            if (existing) {
              existing.setValue(stored.content)
              model = existing
            } else {
              model = this.monaco.editor.createModel(stored.content, stored.language, uri)
            }
            this.monacoModels.set(this.activeFile, model)
          }
        }
        if (model) {
          this.editor.setModel(model)
          this.editor.layout()
          console.debug('[Monaco] mount() set model for active file', this.activeFile)
        }
      } catch (err) {
        console.error('[Monaco] mount() error setting model', err)
      }
    }
  }

  /** Disposes the editor, all Monaco models, and clears all internal state. */
  dispose(): void {
    // Invalidate any in-flight mount() calls
    this.mountGeneration++

    // Clean up diff editor if open
    this.closeDiff()

    this.disconnectLsp()
    this.lspProviders?.dispose()
    this.lspProviders = null
    this.editorOpenerDisposable?.dispose()
    this.editorOpenerDisposable = null
    for (const d of this.fixWithAIDisposables) d.dispose()
    this.fixWithAIDisposables = []
    this.changeDisposable?.dispose()
    this.changeDisposable = null
    this.markerDisposable?.dispose()
    this.markerDisposable = null
    if (this.markerNotifyTimer) {
      clearTimeout(this.markerNotifyTimer)
      this.markerNotifyTimer = null
    }
    this.clearExtraLibs()

    for (const model of this.monacoModels.values()) {
      model.dispose()
    }
    this.monacoModels.clear()
    this.fileContents.clear()
    this.tabs.clear()
    // NOTE: Do NOT clear changeListeners here. External subscribers (e.g.
    // auto-save, tab sync) register via onChange() and manage their own
    // lifecycle through the returned unsubscribe function. Clearing them
    // on dispose() silently drops callbacks that won't be re-registered
    // because the subscribing effect's deps haven't changed.

    if (this.editor) {
      // Defer the actual editor disposal to the next microtask so any in-progress
      // Monaco UI operations (context menu creation, suggest widget rendering)
      // can finish before the InstantiationService is torn down. Disposing
      // synchronously while Monaco is mid-render causes "InstantiationService
      // has been disposed" errors.
      const editorToDispose = this.editor
      this.editor = null
      queueMicrotask(() => editorToDispose.dispose())
    }

    this.activeFile = null
    this.containerElement = null
    this.monaco = null
  }

  /**
   * Opens a file in the editor, creating a new tab and Monaco model if needed.
   * @param file - The file to open (path, content, and optional language).
   */
  openFile(file: EditorFile): void {
    // Close diff view if open — user is switching back to normal editing
    this.closeDiff()

    // If the file is already open as a permanent tab, just switch to it
    const existing = this.tabs.get(file.path)
    if (existing && !existing.isPreview) {
      this.setActiveTab(file.path)
      return
    }

    // When opening as preview, close any existing preview tab first
    if (file.isPreview) {
      for (const [path, tab] of this.tabs) {
        if (tab.isPreview && path !== file.path) {
          this.tabs.delete(path)
          this.fileContents.delete(path)
          const model = this.monacoModels.get(path)
          if (model) {
            model.dispose()
            this.monacoModels.delete(path)
          }
          break
        }
      }
    }

    const tab: EditorTab = {
      path: file.path,
      label: file.path.split('/').pop() ?? file.path,
      isDirty: false,
      isActive: true,
      isPreview: file.isPreview ?? false,
    }

    // Deactivate previous tab
    if (this.activeFile) {
      const prev = this.tabs.get(this.activeFile)
      if (prev) this.tabs.set(this.activeFile, { ...prev, isActive: false })
    }

    this.tabs.set(file.path, tab)
    this.fileContents.set(file.path, { content: file.content, language: file.language })
    this.activeFile = file.path

    // Create or reuse Monaco model — wrapped in try/catch so a Monaco error
    // (e.g. URI conflict from stale global registry after HMR) never prevents
    // changeListeners from firing and tabs from updating.
    console.debug('[Monaco] openFile', file.path, {
      hasMonaco: !!this.monaco,
      hasEditor: !!this.editor,
      contentLength: file.content?.length,
      contentPreview: file.content?.slice(0, 80),
    })
    if (this.monaco) {
      try {
        // Dispose the change listener before any setValue calls so that
        // programmatic content updates don't trigger the dirty-marking listener.
        if (this.editor) this.changeDisposable?.dispose()

        let model = this.monacoModels.get(file.path)
        if (!model) {
          // file.path starts with '/' so `file://${file.path}` gives the correct
          // 3-slash form: file:///app/src/index.ts  (NOT file:////app/… with 4 slashes)
          const uri = this.monaco.Uri.parse(`file://${file.path}`)
          // Monaco keeps a global model registry that survives HMR reloads.
          // Reuse the existing model (update its content) rather than trying
          // to create a duplicate URI and getting a "Model already exists" error.
          const existing = this.monaco.editor.getModel(uri)
          if (existing) {
            existing.setValue(file.content)
            // Clear stale LSP markers from a previous session (model survives HMR/reopen)
            this.monaco.editor.setModelMarkers(existing, 'lsp', [])
            model = existing
          } else {
            model = this.monaco.editor.createModel(file.content, file.language, uri)
          }
          this.monacoModels.set(file.path, model)
        } else {
          // Model already exists — update its content with the freshly fetched file
          model.setValue(file.content)
        }
        if (this.editor) {
          this.editor.setModel(model)
          this.wireChangeListener()
          // Force Monaco to measure its container and render the new model content.
          // Needed when the tab bar appears (shrinking the container) or when
          // automaticLayout's ResizeObserver hasn't fired yet.
          this.editor.layout()
          console.debug(
            '[Monaco] setModel done',
            file.path,
            'modelValue length:',
            model.getValue().length,
          )
        } else {
          console.debug('[Monaco] editor is null, model created but not set')
        }
      } catch (err) {
        console.error('[Monaco] openFile error', err)
      }
    } else {
      console.debug('[Monaco] monaco not loaded yet — model will be set when mount() completes')
    }

    // Notify LSP server of opened document
    if (this.lspClient?.isConnected()) {
      const uri = this.lspClient.toLspUri(file.path)
      const version = (this.documentVersions.get(file.path) ?? 0) + 1
      this.documentVersions.set(file.path, version)
      if (!this.lspClient.isOpen(uri)) {
        this.lspClient.didOpen(uri, this.getLspLanguageId(file.path), version, file.content)
      }
    }

    // Notify change listeners so useEditor hooks in other components (e.g. EditorPanel)
    // update their tabs/activeFile state
    this.versionCounter++
    const event: EditorChangeEvent = {
      path: file.path,
      content: file.content,
      version: this.versionCounter,
    }
    this.notifyChangeListeners(event)
  }

  /**
   * Closes a file tab, disposes its Monaco model, and switches to the next available tab.
   * @param path - The file path to close.
   */
  closeFile(path: string): void {
    // If closing a diff tab, clean up the diff editor
    const tab = this.tabs.get(path)
    if (tab?.isDiff && this.diffEditor) {
      this.closeDiff()
      return
    }

    this.tabs.delete(path)
    this.fileContents.delete(path)

    const model = this.monacoModels.get(path)
    if (model) {
      model.dispose()
      this.monacoModels.delete(path)
    }

    // Notify LSP server
    if (this.lspClient?.isConnected()) {
      this.lspClient.didClose(this.lspClient.toLspUri(path))
      this.documentVersions.delete(path)
    }

    if (this.activeFile === path) {
      const remaining = [...this.tabs.keys()]
      this.activeFile = remaining.length > 0 ? remaining[remaining.length - 1] : null
      if (this.activeFile) {
        const tab = this.tabs.get(this.activeFile)
        if (tab) this.tabs.set(this.activeFile, { ...tab, isActive: true })
        // Switch model
        const nextModel = this.monacoModels.get(this.activeFile)
        if (nextModel && this.editor) {
          this.changeDisposable?.dispose()
          this.editor.setModel(nextModel)
          this.wireChangeListener()
        }
      } else if (this.editor) {
        this.editor.setModel(null)
      }
    }

    // Notify change listeners so all useEditor hooks update their tabs list.
    const newActive = this.activeFile
    const content = newActive ? (this.fileContents.get(newActive)?.content ?? '') : ''
    this.versionCounter++
    this.notifyChangeListeners({ path: newActive ?? path, content, version: this.versionCounter })
  }

  /**
   * Returns the content of the active file from its Monaco model, or from the internal store as fallback.
   * @returns The file content, or `null` if no file is active.
   */
  getContent(): string | null {
    if (!this.activeFile) return null

    // Prefer Monaco model if available
    const model = this.monacoModels.get(this.activeFile)
    if (model) return model.getValue()

    // Fallback to stored content
    const stored = this.fileContents.get(this.activeFile)
    return stored?.content ?? null
  }

  /**
   * Programmatically sets the content of a file, updating both the internal store and its Monaco model.
   * @param path - The file path to update.
   * @param content - The new content to set.
   */
  setContent(path: string, content: string): void {
    const stored = this.fileContents.get(path)
    if (stored) {
      stored.content = content
    }

    // Update Monaco model if it exists.
    // Suppress the wireChangeListener during setValue so we don't double-fire
    // change events (setValue triggers onDidChangeModelContent synchronously).
    const model = this.monacoModels.get(path)
    if (model) {
      const isActiveModel = path === this.activeFile && this.editor
      if (isActiveModel) this.changeDisposable?.dispose()
      model.setValue(content)
      if (isActiveModel) this.wireChangeListener()
    }

    this.versionCounter++
    const event: EditorChangeEvent = {
      path,
      content,
      version: this.versionCounter,
    }
    this.notifyChangeListeners(event)
  }

  /**
   * Silently updates file content without firing change events or marking dirty.
   * Preserves cursor position. Used for format-on-save results that should not re-trigger auto-save.
   * @param path - The file path to update.
   * @param content - The new formatted content.
   */
  setContentSilent(path: string, content: string): void {
    const stored = this.fileContents.get(path)
    if (stored) {
      stored.content = content
    }

    const model = this.monacoModels.get(path)
    if (!model) return

    // Save cursor position for the active file
    let savedPosition: { lineNumber: number; column: number } | null = null
    if (path === this.activeFile && this.editor) {
      savedPosition = this.editor.getPosition()
    }

    // Suppress change listener during setValue (same pattern as openFile).
    // Only dispose/re-wire if this is the active model — otherwise setValue on a
    // background model won't trigger onDidChangeModelContent on the editor anyway,
    // and needlessly disposing the active listener creates a window where user
    // keystrokes are lost.
    const isActiveModel = path === this.activeFile && this.editor
    if (isActiveModel) this.changeDisposable?.dispose()
    model.setValue(content)
    if (isActiveModel) this.wireChangeListener()

    // Notify LSP so it re-analyzes and clears stale diagnostics
    if (this.lspClient?.isConnected()) {
      const uri = this.lspClient.toLspUri(path)
      const docVersion = (this.documentVersions.get(path) ?? 0) + 1
      this.documentVersions.set(path, docVersion)
      this.lspClient.didChange(uri, docVersion, content)
    }

    // Restore cursor, clamped to valid bounds
    if (savedPosition && this.editor && path === this.activeFile) {
      const lines = content.split('\n')
      const line = Math.min(savedPosition.lineNumber, lines.length)
      const maxCol = (lines[line - 1]?.length ?? 0) + 1
      const col = Math.min(savedPosition.column, maxCol)
      this.editor.setPosition({ lineNumber: line, column: col })
    }
  }

  /**
   * Returns the current cursor position in the active editor.
   * @returns The line and column of the cursor, or `null` if no editor is mounted.
   */
  getCursorPosition(): EditorPosition | null {
    if (!this.editor) return null
    const pos = this.editor.getPosition()
    if (!pos) return null
    return { line: pos.lineNumber, column: pos.column }
  }

  /**
   * Moves the cursor to the specified position in the active editor.
   * @param position - The target line and column.
   */
  setCursorPosition(position: EditorPosition): void {
    if (!this.editor) return
    this.editor.setPosition({ lineNumber: position.line, column: position.column })
    this.editor.revealLineInCenter(position.line)
  }

  /** Focuses the Monaco editor instance. */
  focus(): void {
    this.editor?.focus()
  }

  /**
   * Notifies all change listeners with re-entrancy protection.
   * If a listener callback synchronously triggers another notification (e.g. by
   * calling openFile/setContent/setActiveTab), the nested call is dropped to
   * prevent infinite loops that freeze the browser tab at 100% CPU.
   * @param event - The editor change event to broadcast to listeners.
   */
  private notifyChangeListeners(event: EditorChangeEvent): void {
    if (this.notifying) return
    this.notifying = true
    try {
      this.changeListeners.forEach((cb) => cb(event))
    } finally {
      this.notifying = false
    }
  }

  /**
   * Registers a callback for editor content changes (from both user edits and programmatic `setContent`).
   * @param callback - Called with the changed file path, new content, and version number.
   * @returns An unsubscribe function that removes the listener.
   */
  onChange(callback: (event: EditorChangeEvent) => void): () => void {
    this.changeListeners.add(callback)
    return () => {
      this.changeListeners.delete(callback)
    }
  }

  /**
   * Returns all open editor tabs with their paths, labels, active state, and dirty flags.
   * @returns An array of `EditorTab` objects.
   */
  getTabs(): EditorTab[] {
    return [...this.tabs.values()]
  }

  /**
   * Switches the active tab to the file at the given path.
   * @param path - The file path of the tab to activate.
   */
  setActiveTab(path: string): void {
    // Close diff view if open — user is switching tabs
    this.closeDiff()

    if (this.activeFile) {
      const prev = this.tabs.get(this.activeFile)
      if (prev) this.tabs.set(this.activeFile, { ...prev, isActive: false })
    }

    const tab = this.tabs.get(path)
    if (tab) {
      this.tabs.set(path, { ...tab, isActive: true })
      this.activeFile = path

      // Switch Monaco model
      const model = this.monacoModels.get(path)
      if (model && this.editor) {
        this.changeDisposable?.dispose()
        this.editor.setModel(model)
        this.wireChangeListener()
      }

      // Notify change listeners so all useEditor hooks (e.g. EditorPanel's)
      // update their tabs/activeFile state to reflect the new active tab.
      const content = this.fileContents.get(path)?.content ?? ''
      this.versionCounter++
      this.notifyChangeListeners({ path, content, version: this.versionCounter })
    }
  }

  /**
   * Promotes a preview tab to a permanent tab.
   * @param path - The file path of the tab to pin.
   */
  pinTab(path: string): void {
    const tab = this.tabs.get(path)
    if (tab && tab.isPreview && !tab.isDiff) {
      this.tabs.set(path, { ...tab, isPreview: false })
      this.versionCounter++
      const content = this.fileContents.get(path)?.content ?? ''
      this.notifyChangeListeners({ path, content, version: this.versionCounter })
    }
  }

  /**
   * Updates editor configuration (theme, font size, tab size, etc.) at runtime.
   * @param config - Partial editor configuration with only the properties to update.
   */
  updateConfig(config: Partial<EditorConfig>): void {
    Object.assign(this.config, config)
    if (this.editor) {
      const options: Record<string, unknown> = {}
      if (config.theme !== undefined) options.theme = config.theme
      if (config.fontFamily !== undefined) options.fontFamily = config.fontFamily
      if (config.fontSize !== undefined) options.fontSize = config.fontSize
      if (config.tabSize !== undefined) options.tabSize = config.tabSize
      if (config.wordWrap !== undefined) options.wordWrap = config.wordWrap ? 'on' : 'off'
      if (config.minimap !== undefined) options.minimap = { enabled: config.minimap }
      if (config.readOnly !== undefined) options.readOnly = config.readOnly
      this.editor.updateOptions(options)
    }
  }

  /**
   * Opens a side-by-side diff view, replacing the normal editor temporarily.
   * The normal editor is hidden (not disposed) and restored when `closeDiff()` is called.
   * @param file - The diff file descriptor containing original, modified content, and path.
   */
  openDiff(file: DiffFile): void {
    if (!this.monaco || !this.containerElement) return

    // Close any existing diff first
    this.closeDiff()

    // Close any existing preview tab (diff tab replaces it, like preview→preview)
    for (const [path, tab] of this.tabs) {
      if (tab.isPreview && path !== file.path) {
        this.tabs.delete(path)
        this.fileContents.delete(path)
        const model = this.monacoModels.get(path)
        if (model) {
          model.dispose()
          this.monacoModels.delete(path)
        }
        break
      }
    }

    // Deactivate current tab
    if (this.activeFile) {
      const prev = this.tabs.get(this.activeFile)
      if (prev) this.tabs.set(this.activeFile, { ...prev, isActive: false })
    }

    // Create a temporary diff tab (uses the real file path so it shows in the tab bar)
    const fileName = file.path.split('/').pop() ?? file.path
    this.tabs.set(file.path, {
      path: file.path,
      label: fileName,
      isDirty: false,
      isActive: true,
      isPreview: true,
      isDiff: true,
    })
    this.activeFile = file.path

    // Hide the normal editor
    this.containerElement.style.display = 'none'

    // Create a sibling container for the diff editor, matching the
    // normal editor's flex layout so it fills the available space.
    const parent = this.containerElement.parentElement
    if (!parent) return
    const diffEl = document.createElement('div')
    diffEl.style.flex = '1'
    diffEl.style.minHeight = '0'
    diffEl.style.overflow = 'hidden'
    parent.appendChild(diffEl)
    this.diffContainerEl = diffEl

    // Create the diff editor
    this.diffEditor = this.monaco.editor.createDiffEditor(diffEl, {
      theme: this.config.theme ?? 'vs-dark',
      fontFamily: this.config.fontFamily,
      fontSize: this.config.fontSize ?? 12,
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      minimap: { enabled: false },
    } as Record<string, unknown>)

    // Create models with explicit URIs so the TS worker can resolve them
    // (without URIs Monaco assigns inmemory://model/N which the TS worker can't find)
    const origUri = this.monaco.Uri.parse(`file:///diff/original/${file.path}`)
    const modUri = this.monaco.Uri.parse(`file:///diff/modified/${file.path}`)
    const original = this.monaco.editor.createModel(file.originalContent, file.language, origUri)
    const modified = this.monaco.editor.createModel(file.modifiedContent, file.language, modUri)
    this.diffModels = { original, modified }
    this.diffEditor.setModel({ original, modified })

    // Notify listeners so UI updates tabs/activeFile
    this.versionCounter++
    this.notifyChangeListeners({
      path: file.path,
      content: file.modifiedContent,
      version: this.versionCounter,
    })
  }

  /** Closes the diff view and restores the normal editor. */
  closeDiff(): void {
    if (!this.diffEditor) return

    // Remove the diff tab and re-activate the previous non-diff tab
    const diffPath = this.activeFile
    if (diffPath) {
      const tab = this.tabs.get(diffPath)
      if (tab?.isDiff) {
        this.tabs.delete(diffPath)
        // Activate the last remaining tab (or clear activeFile)
        const remaining = [...this.tabs.keys()]
        if (remaining.length > 0) {
          const lastPath = remaining[remaining.length - 1]
          this.tabs.set(lastPath, { ...this.tabs.get(lastPath)!, isActive: true })
          this.activeFile = lastPath
        } else {
          this.activeFile = null
        }
      }
    }

    this.diffEditor.dispose()
    this.diffEditor = null

    if (this.diffModels) {
      this.diffModels.original.dispose()
      this.diffModels.modified.dispose()
      this.diffModels = null
    }

    if (this.diffContainerEl) {
      this.diffContainerEl.remove()
      this.diffContainerEl = null
    }

    // Show the normal editor again
    if (this.containerElement) {
      this.containerElement.style.display = ''
    }

    // Notify listeners so tab bar re-renders
    this.versionCounter++
    const content = this.activeFile ? (this.fileContents.get(this.activeFile)?.content ?? '') : ''
    this.notifyChangeListeners({
      path: this.activeFile ?? '',
      content,
      version: this.versionCounter,
    })
  }

  /**
   * Configures TypeScript/JavaScript language defaults (compiler options, diagnostics).
   * @param monaco - The Monaco module instance.
   */
  private configureTypeScript(monaco: MonacoModule): void {
    const compilerOptions: Record<string, unknown> = {
      target: 99, // ESNext
      module: 99, // ESNext
      moduleResolution: 2, // Node (Classic=1, Node=2, Bundler=100) — Node is most reliable with Monaco extra libs
      jsx: 4, // react-jsx
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      // Tell the TS worker where @types/* packages live in the virtual filesystem.
      // Without this, the default typeRoots ("./node_modules/@types") resolves relative
      // to an unknown root and the worker can't find @types packages in extra libs.
      typeRoots: [
        'file:///workspace/node_modules/@types',
        'file:///workspace/app/node_modules/@types',
      ],
      ...this.config.tsCompilerOptions,
    }

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions)
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions)

    // Disable built-in semantic validation — the LSP server provides diagnostics.
    // Keeping it enabled causes the Monaco TS worker to attempt module resolution
    // for every import, freezing the page when @molecule/* packages aren't
    // registered as extra libs (they live in the sandbox, not the browser).
    const diagOptions = {
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    }
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagOptions)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagOptions)

    // Disable ALL built-in TS language features — LSP provides what we need.
    // Any enabled feature triggers the TS web worker, which attempts to resolve
    // all @molecule/* imports (not available in browser) and freezes the tab.
    const modeOff = {
      completionItems: false,
      hovers: false,
      definitions: false,
      references: false,
      documentHighlights: false,
      documentSymbols: false,
      rename: false,
      signatureHelp: false,
      diagnostics: false,
      documentRangeFormattingEdits: false,
      onTypeFormattingEdits: false,
      codeActions: false,
      inlayHints: false,
    }
    monaco.languages.typescript.typescriptDefaults.setModeConfiguration?.(modeOff)
    monaco.languages.typescript.javascriptDefaults.setModeConfiguration?.(modeOff)
  }

  /**
   * Subscribes to Monaco marker changes and updates tab diagnostics.
   * @param monaco - The Monaco module instance.
   */
  private wireMarkerListener(monaco: MonacoModule): void {
    this.markerDisposable?.dispose()
    this.markerDisposable = monaco.editor.onDidChangeMarkers(() => {
      let changed = false
      for (const [path, tab] of this.tabs) {
        const model = this.monacoModels.get(path)
        if (!model) continue
        // Only count markers we own ('lsp'). Monaco's built-in TS checker may
        // produce markers under a different owner that persist even after the
        // LSP clears its diagnostics (e.g. when setModeConfiguration is unavailable).
        const markers = monaco.editor.getModelMarkers({ resource: model.uri })
        let errors = 0
        let warnings = 0
        for (const m of markers) {
          if (m.owner !== 'lsp') continue
          if (m.severity === monaco.MarkerSeverity.Error) errors++
          else if (m.severity === monaco.MarkerSeverity.Warning) warnings++
        }
        const prev = tab.diagnostics
        if (prev?.errors !== errors || prev?.warnings !== warnings) {
          this.tabs.set(path, { ...tab, diagnostics: { errors, warnings } })
          changed = true
        }
      }
      if (changed) {
        // Debounce change notifications from marker updates.
        // LSP can send many diagnostic batches in quick succession (e.g. after
        // a file save + format), and each fires onDidChangeMarkers. Without
        // debouncing, every burst notifies all subscribers synchronously,
        // causing cascading React re-renders that can freeze the tab.
        if (this.markerNotifyTimer) clearTimeout(this.markerNotifyTimer)
        this.markerNotifyTimer = setTimeout(() => {
          this.markerNotifyTimer = null
          this.versionCounter++
          const content = this.activeFile
            ? (this.fileContents.get(this.activeFile)?.content ?? '')
            : ''
          this.notifyChangeListeners({
            path: this.activeFile ?? '',
            content,
            version: this.versionCounter,
          })
        }, 100)
      }
    })
  }

  /**
   * Adds a type definition or virtual file for module resolution.
   * Tracks the disposable so repeated calls for the same path replace the previous registration.
   * @param content - The file content (e.g. `.d.ts` declarations).
   * @param filePath - The virtual file path for module resolution.
   */
  addExtraLib(content: string, filePath: string): void {
    if (!this.monaco) return

    // Dispose previous registration for this path (prevents duplicate entries)
    const existing = this.extraLibDisposables.get(filePath)
    if (existing) existing.dispose()

    const tsDisposable = this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      content,
      filePath,
    )
    const jsDisposable = this.monaco.languages.typescript.javascriptDefaults.addExtraLib(
      content,
      filePath,
    )

    this.extraLibDisposables.set(filePath, {
      dispose() {
        tsDisposable.dispose()
        jsDisposable.dispose()
      },
    })
  }

  /** Removes all registered extra libs. Called during cleanup/dispose. */
  clearExtraLibs(): void {
    for (const d of this.extraLibDisposables.values()) d.dispose()
    this.extraLibDisposables.clear()
  }

  /**
   * Sets a file resolver used by Go to Definition / Peek Definition to fetch
   * content for files not yet opened in the editor.
   * @param resolver - Async function that fetches file content and language by path.
   */
  setFileResolver(
    resolver: (path: string) => Promise<{ content: string; language?: string } | null>,
  ): void {
    this.fileResolver = resolver
  }

  /**
   * Registers a Monaco editor opener that intercepts cross-file navigation
   * (Go to Definition, Cmd+Click) and opens the target file in the editor.
   * @param monaco - The Monaco module instance.
   */
  private registerEditorOpener(monaco: MonacoModule): void {
    this.editorOpenerDisposable?.dispose()
    if (!monaco.editor.registerEditorOpener) return

    this.editorOpenerDisposable = monaco.editor.registerEditorOpener({
      openCodeEditor: async (
        _source: unknown,
        resource: unknown,
        selectionOrPosition?: unknown,
      ): Promise<boolean> => {
        const uri = resource as { toString(): string; path?: string }
        const uriStr = uri.toString()

        // Only handle file:// URIs
        if (!uriStr.startsWith('file://')) return false

        // Extract path from URI (e.g. file:///workspace/app/src/App.tsx → /workspace/app/src/App.tsx)
        const filePath = uri.path ?? uriStr.replace(/^file:\/\//, '')

        // If file is already open as a tab, just switch to it
        const existingTab = this.tabs.get(filePath)
        if (existingTab) {
          this.setActiveTab(filePath)
        } else {
          // Fetch content via resolver and open as preview tab
          if (!this.fileResolver) return false
          const resolved = await this.fileResolver(filePath)
          if (!resolved) return false
          this.openFile({
            path: filePath,
            content: resolved.content,
            language: resolved.language,
            isPreview: true,
          })
        }

        // Set cursor position from the selection/position argument
        if (selectionOrPosition && this.editor) {
          const sel = selectionOrPosition as {
            startLineNumber?: number
            startColumn?: number
            lineNumber?: number
            column?: number
          }
          const line = sel.startLineNumber ?? sel.lineNumber ?? 1
          const column = sel.startColumn ?? sel.column ?? 1
          this.editor.setPosition({ lineNumber: line, column })
          this.editor.focus()
        }

        return true
      },
    })
  }

  /**
   * Connects to an LSP server over WebSocket and registers Monaco language providers.
   * Disables built-in TS diagnostics in favour of LSP-provided ones.
   * @param wsUrl - The WebSocket URL of the LSP server.
   */
  async connectLsp(wsUrl: string): Promise<void> {
    // Disconnect old client without disposing providers — they read from lspClientRef
    if (this.lspClient) {
      this.lspClient.disconnect()
      this.lspClient = null
      this.lspClientRef.current = null
      this.documentVersions.clear()
    }

    const client = new LspClient(wsUrl)
    await client.connect()
    this.lspClient = client
    this.lspClientRef.current = client

    // On unexpected disconnect, null out the client ref so providers return
    // empty results instead of erroring. Reconnection is handled by the
    // Workspace useEffect which re-fires when sandboxStatus → 'running'.
    client.onDisconnect(() => {
      console.debug('[Monaco] LSP connection dropped')
      this.lspClient = null
      this.lspClientRef.current = null
      this.documentVersions.clear()
      this.onLspDisconnectCb?.()
    })

    // Register LSP providers ONCE — they read from lspClientRef so they
    // survive reconnections without being disposed (avoids Monaco disposal bugs).
    if (this.monaco && !this.lspProviders) {
      const lspOptions: LspProviderOptions = {}
      if (this.fileResolver) {
        const resolver = this.fileResolver
        const monaco = this.monaco
        lspOptions.resolveModel = async (uriStr: string): Promise<boolean> => {
          const filePath = uriStr.replace(/^file:\/\//, '')
          const resolved = await resolver(filePath)
          if (!resolved) return false
          const uri = monaco.Uri.parse(uriStr)
          if (!monaco.editor.getModel(uri)) {
            const model = monaco.editor.createModel(resolved.content, resolved.language, uri)
            this.lspResolvedModels.push(model as unknown as MonacoModel)
          }
          return true
        }
      }
      this.lspProviders = registerLspProviders(
        this.monaco as unknown as LspMonacoModule,
        this.lspClientRef,
        lspOptions,
      )
    }

    // Register diagnostics handler on this specific client instance
    if (this.monaco) {
      const monaco = this.monaco
      client.onNotification('textDocument/publishDiagnostics', (params: unknown) => {
        const p = params as {
          uri: string
          diagnostics: {
            range: {
              start: { line: number; character: number }
              end: { line: number; character: number }
            }
            severity?: number
            message: string
            source?: string
          }[]
        }
        const editorUri = client.fromLspUri(p.uri)
        const model = monaco.editor.getModel(monaco.Uri.parse(editorUri))
        if (!model) return
        const markers = p.diagnostics.map(
          (d: {
            range: {
              start: { line: number; character: number }
              end: { line: number; character: number }
            }
            severity?: number
            message: string
            source?: string
          }) => ({
            severity:
              d.severity === 1
                ? monaco.MarkerSeverity.Error
                : d.severity === 2
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
            message: d.message,
            source: d.source ?? 'typescript',
            startLineNumber: d.range.start.line + 1,
            startColumn: d.range.start.character + 1,
            endLineNumber: d.range.end.line + 1,
            endColumn: d.range.end.character + 1,
          }),
        )
        monaco.editor.setModelMarkers(model, 'lsp', markers)
      })
    }

    // Send didOpen for all currently open files
    for (const [path, stored] of this.fileContents) {
      const uri = client.toLspUri(path)
      const version = 1
      this.documentVersions.set(path, version)
      client.didOpen(uri, this.getLspLanguageId(path), version, stored.content)
    }

    console.debug('[Monaco] LSP connected', wsUrl)
  }

  /**
   * Register a callback for when the LSP connection drops unexpectedly.
   * @param cb - The callback to invoke on unexpected disconnect.
   */
  onLspDisconnect(cb: () => void): void {
    this.onLspDisconnectCb = cb
  }

  /** Disconnects from the LSP server. Providers stay registered (they read lspClientRef). */
  disconnectLsp(): void {
    this.lspClient?.disconnect()
    this.lspClient = null
    this.lspClientRef.current = null
    this.documentVersions.clear()

    // Clear all LSP markers so stale diagnostics don't linger after disconnect
    if (this.monaco) {
      for (const model of this.monacoModels.values()) {
        this.monaco.editor.setModelMarkers(model, 'lsp', [])
      }
    }

    // Dispose models created lazily for Peek Definition to free worker memory
    for (const model of this.lspResolvedModels) {
      model.dispose()
    }
    this.lspResolvedModels = []

    console.debug('[Monaco] LSP disconnected')
  }

  /**
   * Maps file extension to LSP language identifier.
   * @param path - The file path to determine language for.
   * @returns The LSP language identifier string.
   */
  private getLspLanguageId(path: string): string {
    if (path.endsWith('.tsx')) return 'typescriptreact'
    if (path.endsWith('.ts')) return 'typescript'
    if (path.endsWith('.jsx')) return 'javascriptreact'
    if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'javascript'
    if (path.endsWith('.json')) return 'json'
    if (path.endsWith('.css')) return 'css'
    if (path.endsWith('.html')) return 'html'
    return 'plaintext'
  }

  /** Attaches a Monaco `onDidChangeModelContent` listener that fires change events and marks tabs dirty. */
  private wireChangeListener(): void {
    if (!this.editor) return
    this.changeDisposable = this.editor.onDidChangeModelContent(() => {
      const model = this.editor?.getModel()
      if (!model || !this.activeFile) return

      const content = model.getValue()
      this.versionCounter++

      // Update internal content store
      const stored = this.fileContents.get(this.activeFile)
      if (stored) stored.content = content

      // Notify LSP server of content change
      if (this.lspClient?.isConnected() && this.activeFile) {
        const uri = this.lspClient.toLspUri(this.activeFile)
        const docVersion = (this.documentVersions.get(this.activeFile) ?? 0) + 1
        this.documentVersions.set(this.activeFile, docVersion)
        this.lspClient.didChange(uri, docVersion, content)
      }

      // Mark tab dirty and promote preview tabs on edit
      const tab = this.tabs.get(this.activeFile)
      if (tab && (!tab.isDirty || tab.isPreview)) {
        this.tabs.set(this.activeFile, { ...tab, isDirty: true, isPreview: false })
      }

      const event: EditorChangeEvent = {
        path: this.activeFile,
        content,
        version: this.versionCounter,
      }
      this.notifyChangeListeners(event)
    })
  }

  /**
   * Registers a callback for "Fix with AI" requests triggered from the editor's
   * lightbulb quick fix menu or right-click context menu.
   * @param callback - Called with diagnostic and code context when the user selects "Fix with AI".
   * @returns An unsubscribe function.
   */
  onFixWithAI(callback: (request: FixWithAIRequest) => void): () => void {
    this.fixWithAIListeners.add(callback)
    return () => {
      this.fixWithAIListeners.delete(callback)
    }
  }

  /**
   * Fires the "Fix with AI" callback with diagnostic info and surrounding code context.
   * Works with or without markers — when no markers are present, uses the editor's
   * current selection or cursor position for context.
   * @param markers - Monaco markers (diagnostics) at the target location, may be empty.
   */
  private fireFixWithAI(markers: MonacoMarker[]): void {
    if (this.fixWithAIListeners.size === 0 || !this.activeFile || !this.monaco) return

    const diagnostics: EditorDiagnostic[] = markers.map((m) => ({
      message: m.message,
      severity: this.mapMarkerSeverity(m.severity),
      startLine: m.startLineNumber,
      startColumn: m.startColumn,
      endLine: m.endLineNumber,
      endColumn: m.endColumn,
      source: m.source,
    }))

    const model = this.editor?.getModel()
    let codeContext: string | undefined
    let selectedCode: string | undefined
    let line: number | undefined

    if (model) {
      if (markers.length > 0) {
        // Use marker range for context (±2 lines)
        const firstLine = Math.max(1, Math.min(...markers.map((m) => m.startLineNumber)) - 2)
        const lastLine = Math.min(
          model.getLineCount(),
          Math.max(...markers.map((m) => m.endLineNumber)) + 2,
        )
        line = markers[0].startLineNumber
        const lines: string[] = []
        for (let i = firstLine; i <= lastLine; i++) {
          lines.push(model.getLineContent(i))
        }
        codeContext = lines.join('\n')
      } else {
        // No markers — use selection or cursor position for context
        const selection = this.editor?.getSelection()
        const hasSelection =
          selection &&
          (selection.startLineNumber !== selection.endLineNumber ||
            selection.startColumn !== selection.endColumn)

        if (hasSelection && selection) {
          // User has selected text
          const firstLine = Math.max(1, selection.startLineNumber - 2)
          const lastLine = Math.min(model.getLineCount(), selection.endLineNumber + 2)
          line = selection.startLineNumber
          const lines: string[] = []
          for (let i = firstLine; i <= lastLine; i++) {
            lines.push(model.getLineContent(i))
          }
          codeContext = lines.join('\n')
          // Extract exact selected text
          const selLines: string[] = []
          for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
            const content = model.getLineContent(i)
            if (i === selection.startLineNumber && i === selection.endLineNumber) {
              selLines.push(content.substring(selection.startColumn - 1, selection.endColumn - 1))
            } else if (i === selection.startLineNumber) {
              selLines.push(content.substring(selection.startColumn - 1))
            } else if (i === selection.endLineNumber) {
              selLines.push(content.substring(0, selection.endColumn - 1))
            } else {
              selLines.push(content)
            }
          }
          selectedCode = selLines.join('\n')
        } else {
          // Just cursor — use ±3 lines for context
          const pos = this.editor?.getPosition()
          if (pos) {
            line = pos.lineNumber
            const firstLine = Math.max(1, pos.lineNumber - 3)
            const lastLine = Math.min(model.getLineCount(), pos.lineNumber + 3)
            const lines: string[] = []
            for (let i = firstLine; i <= lastLine; i++) {
              lines.push(model.getLineContent(i))
            }
            codeContext = lines.join('\n')
          }
        }
      }
    }

    const request: FixWithAIRequest = {
      path: this.activeFile,
      diagnostics,
      codeContext,
      selectedCode,
      line,
    }
    this.fixWithAIListeners.forEach((cb) => cb(request))
  }

  /**
   * Maps Monaco MarkerSeverity numbers to EditorDiagnostic severity strings.
   * @param severity - Monaco marker severity number.
   * @returns Human-readable severity string.
   */
  private mapMarkerSeverity(severity: number): EditorDiagnostic['severity'] {
    if (!this.monaco) return 'error'
    if (severity === this.monaco.MarkerSeverity.Error) return 'error'
    if (severity === this.monaco.MarkerSeverity.Warning) return 'warning'
    if (severity === this.monaco.MarkerSeverity.Info) return 'info'
    return 'hint'
  }

  /**
   * Get current diagnostics for a file from the LSP markers.
   * @param path - The file path (with or without /workspace/ prefix).
   * @returns Array of diagnostics, or empty if no model/markers exist.
   */
  getDiagnostics(path: string): EditorDiagnostic[] {
    if (!this.monaco) return []
    const model = this.monacoModels.get(path)
    if (!model) return []
    const markers = this.monaco.editor.getModelMarkers({ resource: model.uri })
    return markers.map((m) => ({
      message: m.message,
      severity: this.mapMarkerSeverity(m.severity),
      startLine: m.startLineNumber,
      startColumn: m.startColumn,
      endLine: m.endLineNumber,
      endColumn: m.endColumn,
      source: m.source,
    }))
  }

  /**
   * Registers "Fix with AI" in the editor's lightbulb quick fix menu and right-click
   * context menu. Both trigger the `onFixWithAI` callback with diagnostic details.
   * @param monaco - The Monaco module instance.
   */
  private registerFixWithAI(monaco: MonacoModule): void {
    for (const d of this.fixWithAIDisposables) d.dispose()
    this.fixWithAIDisposables = []
    if (!this.editor) return

    const fixLabel = t('editor.fixWithAI', undefined, { defaultValue: 'Fix with AI' })
    const askLabel = t('editor.askAI', undefined, { defaultValue: 'Ask AI' })

    // Register a command that the code action provider can reference.
    // addCommand returns the command ID; handler receives (accessor, ...args).
    const cmdId = this.editor.addCommand(0, (...args: unknown[]) => {
      const markers = args[1] as MonacoMarker[] | undefined
      if (markers && markers.length > 0) {
        this.fireFixWithAI(markers)
      }
    })

    // Context menu action — sends code context (with any diagnostics) to AI
    const actionDisposable = this.editor.addAction({
      id: 'molecule.askAI',
      label: askLabel,
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 0,
      run: () => {
        const position = this.editor?.getPosition()
        const model = this.editor?.getModel()
        if (!position || !model) return
        const markers = monaco.editor.getModelMarkers({ resource: model.uri })
        // Include diagnostics at cursor if any exist, otherwise pass empty array
        const atCursor = markers.filter(
          (m) => position.lineNumber >= m.startLineNumber && position.lineNumber <= m.endLineNumber,
        )
        this.fireFixWithAI(atCursor)
      },
    })
    this.fixWithAIDisposables.push(actionDisposable)

    // Code action provider — shows "Fix with AI" in the lightbulb quick fix menu
    // when hovering over diagnostics (red/yellow squiggles)
    const codeActionDisposable = monaco.languages.registerCodeActionProvider('*', {
      provideCodeActions: (
        _model: MonacoModel,
        _range: unknown,
        context: { markers: MonacoMarker[] },
      ) => {
        if (context.markers.length === 0) return { actions: [], dispose() {} }

        const action: MonacoCodeAction = {
          title: fixLabel,
          kind: 'quickfix',
          diagnostics: context.markers,
          ...(cmdId
            ? {
                command: {
                  id: cmdId,
                  title: fixLabel,
                  arguments: [context.markers],
                },
              }
            : {}),
        }

        return { actions: [action], dispose() {} }
      },
    })
    this.fixWithAIDisposables.push(codeActionDisposable)
  }

  /**
   * Marks a file tab as saved (clears the dirty flag) and notifies listeners.
   * @param path - The file path to mark as saved.
   */
  markSaved(path: string): void {
    const tab = this.tabs.get(path)
    if (tab && tab.isDirty) {
      this.tabs.set(path, { ...tab, isDirty: false })
      // Notify listeners so useEditor() re-renders with the updated tab state
      this.versionCounter++
      const content = this.fileContents.get(path)?.content ?? ''
      this.notifyChangeListeners({ path, content, version: this.versionCounter })
    }
  }
}

/**
 * Creates a `MonacoEditorProvider` instance with optional configuration.
 * @param config - Monaco-specific editor options (theme, font size, etc.).
 * @returns A `MonacoEditorProvider` that manages Monaco Editor instances.
 */
export function createProvider(config?: MonacoConfig): MonacoEditorProvider {
  return new MonacoEditorProvider(config)
}
