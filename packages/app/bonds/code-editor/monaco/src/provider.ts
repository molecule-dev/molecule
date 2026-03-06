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
    } as Record<string, unknown>)

    this.wireChangeListener()
    this.configureTypeScript(monaco)
    this.wireMarkerListener(monaco)
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

    this.changeDisposable?.dispose()
    this.changeDisposable = null
    this.markerDisposable?.dispose()
    this.markerDisposable = null

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

  /** Configures TypeScript/JavaScript language defaults (compiler options, diagnostics). */
  private configureTypeScript(monaco: MonacoModule): void {
    const compilerOptions: Record<string, unknown> = {
      target: 99, // ESNext
      module: 99, // ESNext
      moduleResolution: 100, // Bundler
      jsx: 4, // react-jsx
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
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

  /** Subscribes to Monaco marker changes and updates tab diagnostics. */
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
   * @param content - The file content (e.g. `.d.ts` declarations).
   * @param filePath - The virtual file path for module resolution.
   */
  addExtraLib(content: string, filePath: string): void {
    if (!this.monaco) return
    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(content, filePath)
    this.monaco.languages.typescript.javascriptDefaults.addExtraLib(content, filePath)
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
