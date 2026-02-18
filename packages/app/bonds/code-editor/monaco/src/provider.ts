/**
 * Monaco Editor implementation of EditorProvider.
 *
 * Uses the Monaco Editor (same editor as VS Code) for code editing
 * with TypeScript support, syntax highlighting, and IntelliSense.
 *
 * @module
 */

import type {
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
}

interface MonacoModule {
  editor: {
    create(element: HTMLElement, options: Record<string, unknown>): MonacoEditor
    createModel(value: string, language?: string, uri?: unknown): MonacoModel
  }
  Uri: {
    parse(uri: string): unknown
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

  constructor(config: MonacoConfig = {}) {
    this.config = {
      theme: config.theme ?? 'vs-dark',
      fontSize: config.fontSize ?? 14,
      tabSize: config.tabSize ?? 2,
      wordWrap: config.wordWrap ?? false,
      minimap: config.minimap ?? true,
      ...config,
    }
  }

  /**
   * Mounts the Monaco Editor into a DOM element. Dynamically imports the `monaco-editor` package.
   * @param element - The HTML element to mount the editor into.
   * @param config - Optional editor configuration merged with constructor defaults.
   */
  async mount(element: HTMLElement, config?: EditorConfig): Promise<void> {
    const mergedConfig = { ...this.config, ...config }

    // Dynamic import — Monaco is a large library, loaded at runtime
    // Uses string variable to avoid compile-time module resolution
    const modulePath = 'monaco-editor'
    const monaco = (await import(/* @vite-ignore */ modulePath)) as unknown as MonacoModule
    this.monaco = monaco

    // Dispose previous editor if exists
    if (this.editor) {
      this.editor.dispose()
    }

    this.editor = monaco.editor.create(element, {
      theme: mergedConfig.theme ?? 'vs-dark',
      fontSize: mergedConfig.fontSize ?? 14,
      tabSize: mergedConfig.tabSize ?? 2,
      wordWrap: mergedConfig.wordWrap ? 'on' : 'off',
      minimap: { enabled: mergedConfig.minimap ?? true },
      readOnly: mergedConfig.readOnly ?? false,
      automaticLayout: true,
    } as Record<string, unknown>)

    this.wireChangeListener()

    // If we have an active file, set its model
    if (this.activeFile) {
      const model = this.monacoModels.get(this.activeFile)
      if (model) {
        this.editor.setModel(model)
      }
    }
  }

  /** Disposes the editor, all Monaco models, and clears all internal state. */
  dispose(): void {
    this.changeDisposable?.dispose()
    this.changeDisposable = null

    for (const model of this.monacoModels.values()) {
      model.dispose()
    }
    this.monacoModels.clear()
    this.fileContents.clear()
    this.tabs.clear()
    this.changeListeners.clear()

    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }

    this.activeFile = null
    this.monaco = null
  }

  /**
   * Opens a file in the editor, creating a new tab and Monaco model if needed.
   * @param file - The file to open (path, content, and optional language).
   */
  openFile(file: EditorFile): void {
    const tab: EditorTab = {
      path: file.path,
      label: file.path.split('/').pop() ?? file.path,
      isDirty: false,
      isActive: true,
    }

    // Deactivate previous tab
    if (this.activeFile) {
      const prev = this.tabs.get(this.activeFile)
      if (prev) this.tabs.set(this.activeFile, { ...prev, isActive: false })
    }

    this.tabs.set(file.path, tab)
    this.fileContents.set(file.path, { content: file.content, language: file.language })
    this.activeFile = file.path

    // Create or reuse Monaco model
    if (this.monaco) {
      let model = this.monacoModels.get(file.path)
      if (!model) {
        const uri = this.monaco.Uri.parse(`file:///${file.path}`)
        model = this.monaco.editor.createModel(file.content, file.language, uri)
        this.monacoModels.set(file.path, model)
      }
      if (this.editor) {
        this.changeDisposable?.dispose()
        this.editor.setModel(model)
        this.wireChangeListener()
      }
    }
  }

  /**
   * Closes a file tab, disposes its Monaco model, and switches to the next available tab.
   * @param path - The file path to close.
   */
  closeFile(path: string): void {
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
    return () => this.changeListeners.delete(callback)
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
      if (config.fontSize !== undefined) options.fontSize = config.fontSize
      if (config.tabSize !== undefined) options.tabSize = config.tabSize
      if (config.wordWrap !== undefined) options.wordWrap = config.wordWrap ? 'on' : 'off'
      if (config.minimap !== undefined) options.minimap = { enabled: config.minimap }
      if (config.readOnly !== undefined) options.readOnly = config.readOnly
      this.editor.updateOptions(options)
    }
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

      // Mark tab dirty
      const tab = this.tabs.get(this.activeFile)
      if (tab && !tab.isDirty) {
        this.tabs.set(this.activeFile, { ...tab, isDirty: true })
      }

      const event: EditorChangeEvent = {
        path: this.activeFile,
        content,
        version: this.versionCounter,
      }
      this.changeListeners.forEach((cb) => cb(event))
    })
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
