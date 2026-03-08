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
  EditorFile,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'

import {
  LspClient,
  type LspMonacoModule,
  type LspProviderOptions,
  registerLspProviders,
} from './lsp-client.js'
import type { MonacoConfig } from './types.js'

/** Minimal Monaco types to avoid importing the full package at compile time. */
interface MonacoEditor {
  dispose(): void
  getModel(): MonacoModel | null
  setModel(model: MonacoModel | null): void
  layout(dimensions?: { width: number; height: number }): void
  getPosition(): { lineNumber: number; column: number } | null
  setPosition(position: { lineNumber: number; column: number }): void
  focus(): void
  updateOptions(options: Record<string, unknown>): void
  onDidChangeModelContent(listener: () => void): { dispose(): void }
}

interface MonacoModel {
  getValue(): string
  setValue(value: string): void
  dispose(): void
  uri: unknown
}

/** Minimal marker type from Monaco's marker service. */
interface MonacoMarker {
  severity: number // 1=Hint, 2=Info, 4=Warning, 8=Error
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
    onDidChangeMarkers(listener: (uris: unknown[]) => void): { dispose(): void }
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
  /** Disposable for LSP-registered Monaco language providers. */
  private lspProviders: { dispose(): void } | null = null
  /** LSP document version counters keyed by file path. */
  private documentVersions: Map<string, number> = new Map()
  /** Callback to fetch file content by path — used for Go to Definition cross-file navigation. */
  private fileResolver:
    | ((path: string) => Promise<{ content: string; language?: string } | null>)
    | null = null
  /** Disposable for the editor opener registration. */
  private editorOpenerDisposable: { dispose(): void } | null = null

  constructor(config: MonacoConfig = {}) {
    this.config = {
      theme: config.theme ?? 'vs-dark',
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

    // Configure Monaco workers for syntax highlighting and language services.
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

    this.editor = monaco.editor.create(element, {
      theme: mergedConfig.theme ?? 'vs-dark',
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
    this.editorOpenerDisposable?.dispose()
    this.editorOpenerDisposable = null
    this.changeDisposable?.dispose()
    this.changeDisposable = null
    this.markerDisposable?.dispose()
    this.markerDisposable = null
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
      this.editor.dispose()
      this.editor = null
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
    this.changeListeners.forEach((cb) => cb(event))
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
    this.changeListeners.forEach((cb) =>
      cb({ path: newActive ?? path, content, version: this.versionCounter }),
    )
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

    // Update Monaco model if it exists
    const model = this.monacoModels.get(path)
    if (model) {
      model.setValue(content)
    }

    this.versionCounter++
    const event: EditorChangeEvent = {
      path,
      content,
      version: this.versionCounter,
    }
    this.changeListeners.forEach((cb) => cb(event))
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

    // Suppress change listener during setValue (same pattern as openFile)
    this.changeDisposable?.dispose()
    model.setValue(content)
    this.wireChangeListener()

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
  }

  /** Focuses the Monaco editor instance. */
  focus(): void {
    this.editor?.focus()
  }

  /**
   * Registers a callback for editor content changes (from both user edits and programmatic `setContent`).
   * @param callback - Called with the changed file path, new content, and version number.
   * @returns An unsubscribe function that removes the listener.
   */
  onChange(callback: (event: EditorChangeEvent) => void): () => void {
    this.changeListeners.add(callback)
    console.log('[Monaco] onChange registered, total listeners:', this.changeListeners.size)
    return () => {
      this.changeListeners.delete(callback)
      console.log('[Monaco] onChange unregistered, total listeners:', this.changeListeners.size)
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
      this.changeListeners.forEach((cb) => cb({ path, content, version: this.versionCounter }))
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
      this.changeListeners.forEach((cb) => cb({ path, content, version: this.versionCounter }))
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
   * @param file
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
    this.changeListeners.forEach((cb) =>
      cb({ path: file.path, content: file.modifiedContent, version: this.versionCounter }),
    )
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
    this.changeListeners.forEach((cb) =>
      cb({ path: this.activeFile ?? '', content, version: this.versionCounter }),
    )
  }

  /**
   * Configures TypeScript/JavaScript language defaults (compiler options, diagnostics).
   * @param monaco
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

    // Enable full diagnostics (syntax, semantic, and suggestions)
    const diagOptions = {
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    }
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagOptions)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagOptions)
  }

  /**
   * Subscribes to Monaco marker changes and updates tab diagnostics.
   * @param monaco
   */
  private wireMarkerListener(monaco: MonacoModule): void {
    this.markerDisposable?.dispose()
    this.markerDisposable = monaco.editor.onDidChangeMarkers(() => {
      let changed = false
      for (const [path, tab] of this.tabs) {
        const model = this.monacoModels.get(path)
        if (!model) continue
        const markers = monaco.editor.getModelMarkers({ resource: model.uri })
        let errors = 0
        let warnings = 0
        for (const m of markers) {
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
        this.versionCounter++
        const content = this.activeFile
          ? (this.fileContents.get(this.activeFile)?.content ?? '')
          : ''
        this.changeListeners.forEach((cb) =>
          cb({ path: this.activeFile ?? '', content, version: this.versionCounter }),
        )
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
   * @param resolver
   */
  setFileResolver(
    resolver: (path: string) => Promise<{ content: string; language?: string } | null>,
  ): void {
    this.fileResolver = resolver
  }

  /**
   * Registers a Monaco editor opener that intercepts cross-file navigation
   * (Go to Definition, Cmd+Click) and opens the target file in the editor.
   * @param monaco
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
   * @param wsUrl
   */
  async connectLsp(wsUrl: string): Promise<void> {
    if (this.lspClient) this.disconnectLsp()

    const client = new LspClient(wsUrl)
    await client.connect()
    this.lspClient = client

    if (this.monaco) {
      // Disable built-in TS language features — LSP server provides them
      const diagOptions = {
        noSemanticValidation: true,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: true,
      }
      const modeOff = {
        completionItems: false,
        hovers: false,
        definitions: false,
        signatureHelp: false,
        diagnostics: false,
      }
      for (const defaults of [
        this.monaco.languages.typescript.typescriptDefaults,
        this.monaco.languages.typescript.javascriptDefaults,
      ]) {
        defaults.setDiagnosticsOptions(diagOptions)
        defaults.setModeConfiguration?.(modeOff)
      }

      // Build resolveModel callback for Peek Definition — lazily creates Monaco
      // models for files that aren't open yet by fetching via the file resolver.
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
            monaco.editor.createModel(resolved.content, resolved.language, uri)
          }
          return true
        }
      }
      this.lspProviders = registerLspProviders(
        this.monaco as unknown as LspMonacoModule,
        client,
        lspOptions,
      )
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

  /** Disconnects from the LSP server and re-enables built-in TS diagnostics. */
  disconnectLsp(): void {
    this.lspProviders?.dispose()
    this.lspProviders = null
    this.lspClient?.disconnect()
    this.lspClient = null
    this.documentVersions.clear()

    // Re-enable built-in TS language features as fallback
    if (this.monaco) {
      const diagOptions = {
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
      }
      const modeOn = {
        completionItems: true,
        hovers: true,
        definitions: true,
        signatureHelp: true,
        diagnostics: true,
      }
      for (const defaults of [
        this.monaco.languages.typescript.typescriptDefaults,
        this.monaco.languages.typescript.javascriptDefaults,
      ]) {
        defaults.setDiagnosticsOptions(diagOptions)
        defaults.setModeConfiguration?.(modeOn)
      }
    }

    console.debug('[Monaco] LSP disconnected')
  }

  /**
   * Maps file extension to LSP language identifier.
   * @param path
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
      console.log(
        '[Monaco] wireChangeListener fired, notifying',
        this.changeListeners.size,
        'listeners for',
        this.activeFile,
      )
      this.changeListeners.forEach((cb) => cb(event))
    })
  }

  /**
   *
   * @param path
   */
  markSaved(path: string): void {
    const tab = this.tabs.get(path)
    if (tab && tab.isDirty) {
      this.tabs.set(path, { ...tab, isDirty: false })
      // Notify listeners so useEditor() re-renders with the updated tab state
      this.versionCounter++
      const content = this.fileContents.get(path)?.content ?? ''
      this.changeListeners.forEach((cb) => cb({ path, content, version: this.versionCounter }))
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
