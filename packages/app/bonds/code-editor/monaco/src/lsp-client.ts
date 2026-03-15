/**
 * LSP client for Monaco editor.
 *
 * Connects to an LSP server via WebSocket and registers Monaco language providers
 * (completion, hover, definition, signature help, diagnostics) that delegate to
 * the remote language server.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// LSP types (minimal subset needed for Monaco conversion)
// ---------------------------------------------------------------------------

interface LspPosition {
  line: number
  character: number
}

interface LspRange {
  start: LspPosition
  end: LspPosition
}

interface LspLocation {
  uri: string
  range: LspRange
}

interface LspCompletionItem {
  label: string
  kind?: number
  detail?: string
  documentation?: string | { kind: string; value: string }
  insertText?: string
  insertTextFormat?: number
  textEdit?: { range: LspRange; newText: string }
  sortText?: string
  filterText?: string
  preselect?: boolean
}

interface LspCompletionList {
  isIncomplete: boolean
  items: LspCompletionItem[]
}

interface LspHover {
  contents: string | { kind: string; value: string } | (string | { kind: string; value: string })[]
  range?: LspRange
}

interface LspSignatureHelp {
  signatures: {
    label: string
    documentation?: string | { kind: string; value: string }
    parameters?: {
      label: string | [number, number]
      documentation?: string | { kind: string; value: string }
    }[]
  }[]
  activeSignature?: number
  activeParameter?: number
}

// ---------------------------------------------------------------------------
// Monaco types (minimal subset to avoid importing the full package)
// ---------------------------------------------------------------------------

/** Extended Monaco module interface with language provider registration methods. */
export interface LspMonacoModule {
  Uri: { parse(uri: string): unknown }
  MarkerSeverity: { Error: number; Warning: number; Info: number; Hint: number }
  languages: {
    registerCompletionItemProvider(
      languageSelector: string | string[],
      provider: unknown,
    ): { dispose(): void }
    registerHoverProvider(
      languageSelector: string | string[],
      provider: unknown,
    ): { dispose(): void }
    registerDefinitionProvider(
      languageSelector: string | string[],
      provider: unknown,
    ): { dispose(): void }
    registerSignatureHelpProvider(
      languageSelector: string | string[],
      provider: unknown,
    ): { dispose(): void }
    typescript: {
      typescriptDefaults: {
        setDiagnosticsOptions(options: Record<string, unknown>): void
      }
    }
  }
  editor: {
    getModel(uri: unknown): { uri: unknown; getValue(): string } | null
    setModelMarkers(model: unknown, owner: string, markers: unknown[]): void
  }
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

const TS_LANGUAGES = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']

/**
 * Converts an LSP range (0-based) to a Monaco range (1-based).
 * @param range - The LSP range to convert.
 * @returns A Monaco-compatible range object with 1-based line/column numbers.
 */
function lspToMonacoRange(range: LspRange): {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
} {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  }
}

/**
 * Converts LSP hover contents to Monaco-compatible hover content format.
 * @param contents - The LSP hover contents (string, MarkupContent, or array).
 * @returns An array of value objects suitable for Monaco hover display.
 */
function convertHoverContents(
  contents: LspHover['contents'],
): { value: string; isTrusted: boolean }[] {
  if (typeof contents === 'string') return [{ value: contents, isTrusted: true }]
  if (Array.isArray(contents)) {
    return contents.map((c) =>
      typeof c === 'string' ? { value: c, isTrusted: true } : { value: c.value, isTrusted: true },
    )
  }
  return [{ value: contents.value, isTrusted: true }]
}

/**
 * Converts an LSP completion item to a Monaco completion suggestion.
 * @param item - The LSP completion item to convert.
 * @returns A Monaco-compatible completion suggestion object.
 */
function convertCompletionItem(item: LspCompletionItem): {
  label: string
  kind: number
  detail?: string
  documentation?: { value: string }
  insertText: string
  sortText?: string
  filterText?: string
  preselect?: boolean
  range?: unknown
} {
  return {
    label: item.label,
    kind: item.kind ?? 0,
    detail: item.detail,
    documentation: item.documentation
      ? typeof item.documentation === 'string'
        ? { value: item.documentation }
        : { value: item.documentation.value }
      : undefined,
    insertText: item.insertText ?? item.label,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    range: item.textEdit ? lspToMonacoRange(item.textEdit.range) : undefined,
  }
}

// ---------------------------------------------------------------------------
// LspClient
// ---------------------------------------------------------------------------

/**
 * WebSocket-based LSP client that communicates with a language server using JSON-RPC.
 */
export class LspClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<
    number,
    { resolve: (r: unknown) => void; reject: (e: Error) => void }
  >()
  private notificationHandlers = new Map<string, (params: unknown) => void>()
  private openDocuments = new Set<string>()
  private connected = false
  private disconnectCb: (() => void) | null = null

  constructor(private wsUrl: string) {}

  /**
   * Convert an editor path or URI to an LSP file:// URI.
   * @param pathOrUri - The editor path or existing file:// URI.
   * @returns The LSP-compatible file:// URI string.
   */
  toLspUri(pathOrUri: string): string {
    if (pathOrUri.startsWith('file://')) return pathOrUri
    return `file://${pathOrUri}`
  }

  /**
   * Convert an LSP URI back to an editor-style file:// URI.
   * @param lspUri - The LSP URI to convert.
   * @returns The editor-style URI string.
   */
  fromLspUri(lspUri: string): string {
    return lspUri
  }

  /** Connect to the LSP WebSocket and perform the initialize handshake. */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      this.ws = ws

      ws.onopen = async () => {
        try {
          await this.sendRequest('initialize', {
            processId: null,
            rootUri: 'file:///workspace',
            capabilities: {
              textDocument: {
                synchronization: { dynamicRegistration: false, didSave: true },
                completion: {
                  dynamicRegistration: false,
                  completionItem: {
                    snippetSupport: true,
                    documentationFormat: ['markdown', 'plaintext'],
                    deprecatedSupport: true,
                    preselectSupport: true,
                  },
                  contextSupport: true,
                },
                hover: {
                  dynamicRegistration: false,
                  contentFormat: ['markdown', 'plaintext'],
                },
                signatureHelp: {
                  dynamicRegistration: false,
                  signatureInformation: {
                    documentationFormat: ['markdown', 'plaintext'],
                  },
                },
                definition: { dynamicRegistration: false },
                publishDiagnostics: { relatedInformation: true },
              },
            },
          })
          this.sendNotification('initialized', {})
          this.connected = true
          console.debug('[LSP] Connected and initialized')
          resolve()
        } catch (err) {
          reject(err)
        }
      }

      ws.onmessage = (event) => {
        try {
          const raw = event.data as string
          const msg = JSON.parse(raw) as {
            id?: number
            method?: string
            result?: unknown
            error?: { code: number; message: string }
            params?: unknown
          }

          // Response to a request we sent
          if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
            console.debug('[LSP] response matched', {
              id: msg.id,
              hasResult: !!msg.result,
              hasError: !!msg.error,
            })
            const pending = this.pendingRequests.get(msg.id)!
            this.pendingRequests.delete(msg.id)
            if (msg.error) {
              pending.reject(new Error(msg.error.message))
            } else {
              pending.resolve(msg.result)
            }
            return
          }

          // Server-initiated notification
          if (msg.method) {
            const handler = this.notificationHandlers.get(msg.method)
            handler?.(msg.params)
          }

          if (msg.id !== undefined && !this.pendingRequests.has(msg.id)) {
            console.debug('[LSP] response with no matching request', {
              id: msg.id,
              pendingIds: [...this.pendingRequests.keys()],
            })
          }
        } catch (err) {
          console.warn('[LSP] onmessage parse error', err, (event.data as string).slice(0, 200))
        }
      }

      ws.onerror = () => {
        if (!this.connected) reject(new Error('LSP WebSocket connection failed'))
      }

      ws.onclose = () => {
        const wasConnected = this.connected
        this.connected = false
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          pending.reject(new Error('LSP connection closed'))
        }
        this.pendingRequests.clear()
        // Notify owner so it can reconnect
        if (wasConnected) this.disconnectCb?.()
      }
    })
  }

  /** Disconnect from the LSP server. */
  disconnect(): void {
    if (!this.ws) return
    try {
      if (this.connected) {
        this.sendNotification('shutdown', null)
        this.sendNotification('exit', null)
      }
    } catch {
      // Ignore errors during shutdown
    }
    this.ws.close()
    this.ws = null
    this.connected = false
    this.openDocuments.clear()
    this.pendingRequests.clear()
  }

  /**
   * Whether the client is currently connected.
   * @returns True if the LSP connection is active.
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Whether a document URI is currently open on the LSP server.
   * @param uri - The document URI to check.
   * @returns True if the document is currently tracked as open.
   */
  isOpen(uri: string): boolean {
    return this.openDocuments.has(uri)
  }

  // --- Document sync ---

  /**
   * Notifies the LSP server that a document has been opened.
   * @param uri - The document URI.
   * @param languageId - The language identifier (e.g. "typescript").
   * @param version - The document version number.
   * @param text - The full document text content.
   */
  didOpen(uri: string, languageId: string, version: number, text: string): void {
    if (!this.connected) return
    this.openDocuments.add(uri)
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text },
    })
  }

  /**
   * Notifies the LSP server that a document's content has changed.
   * @param uri - The document URI.
   * @param version - The new document version number.
   * @param text - The full updated document text content.
   */
  didChange(uri: string, version: number, text: string): void {
    if (!this.connected) return
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    })
  }

  /**
   * Notifies the LSP server that a document has been closed.
   * @param uri - The document URI being closed.
   */
  didClose(uri: string): void {
    if (!this.connected) return
    this.openDocuments.delete(uri)
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    })
  }

  // --- Language features ---

  /**
   * Requests code completion suggestions at a given position.
   * @param uri - The document URI.
   * @param line - The 0-based line number.
   * @param character - The 0-based character offset.
   * @returns A completion list with items and whether the list is incomplete.
   */
  async completion(uri: string, line: number, character: number): Promise<LspCompletionList> {
    const result = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
    })
    if (!result) return { isIncomplete: false, items: [] }
    if (Array.isArray(result)) return { isIncomplete: false, items: result as LspCompletionItem[] }
    return result as LspCompletionList
  }

  /**
   * Requests hover information at a given position.
   * @param uri - The document URI.
   * @param line - The 0-based line number.
   * @param character - The 0-based character offset.
   * @returns The hover information, or null if none available.
   */
  async hover(uri: string, line: number, character: number): Promise<LspHover | null> {
    const result = await this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    })
    return (result as LspHover) ?? null
  }

  /**
   * Requests go-to-definition locations at a given position.
   * @param uri - The document URI.
   * @param line - The 0-based line number.
   * @param character - The 0-based character offset.
   * @returns An array of definition locations.
   */
  async definition(uri: string, line: number, character: number): Promise<LspLocation[]> {
    const result = await this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    })
    if (!result) return []
    if (Array.isArray(result)) return result as LspLocation[]
    return [result as LspLocation]
  }

  /**
   * Requests function signature help at a given position.
   * @param uri - The document URI.
   * @param line - The 0-based line number.
   * @param character - The 0-based character offset.
   * @returns The signature help information, or null if unavailable.
   */
  async signatureHelp(
    uri: string,
    line: number,
    character: number,
  ): Promise<LspSignatureHelp | null> {
    const result = await this.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri },
      position: { line, character },
    })
    return (result as LspSignatureHelp) ?? null
  }

  // --- Notification registration ---

  /**
   * Registers a callback invoked when the connection drops unexpectedly.
   * @param cb - The callback to invoke on unexpected disconnect.
   */
  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb
  }

  /**
   * Registers a handler for server-initiated notifications.
   * @param method - The LSP notification method name.
   * @param handler - The callback to invoke when the notification arrives.
   */
  onNotification(method: string, handler: (params: unknown) => void): void {
    this.notificationHandlers.set(method, handler)
  }

  // --- Internal ---

  /**
   * Sends a JSON-RPC request to the LSP server and waits for the response.
   * @param method - The LSP request method name.
   * @param params - The request parameters.
   * @returns A promise that resolves with the server's response.
   */
  private sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('LSP WebSocket not open'))
        return
      }
      const id = ++this.requestId
      this.pendingRequests.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    })
  }

  /**
   * Sends a one-way JSON-RPC notification to the LSP server (no response expected).
   * @param method - The LSP notification method name.
   * @param params - The notification parameters.
   */
  private sendNotification(method: string, params: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ jsonrpc: '2.0', method, params }))
  }
}

// ---------------------------------------------------------------------------
// Monaco provider registration
// ---------------------------------------------------------------------------

/**
 * Options for `registerLspProviders`.
 *
 * `resolveModel` — called when Go-to-definition / Peek-definition targets a
 * URI that has no Monaco model yet. Should fetch the file content, create a
 * model via `monaco.editor.createModel`, and return `true` on success.
 */
export interface LspProviderOptions {
  resolveModel?: (uri: string) => Promise<boolean>
}

/**
 * Mutable reference to the current LSP client. Providers read from this so
 * they survive across reconnections without being disposed and re-registered
 * (which triggers Monaco's InstantiationService disposal bug).
 */
export interface LspClientRef {
  current: LspClient | null
}

/**
 * Registers LSP-backed Monaco language providers for TypeScript/JavaScript.
 * Returns a disposable that unregisters all providers.
 * @param monaco - The Monaco module instance with language and editor APIs.
 * @param clientRef - Mutable ref to the current LSP client (swapped on reconnect).
 * @param options - Optional configuration (e.g. custom model resolver for definition).
 * @returns A disposable that unregisters all registered providers.
 */
export function registerLspProviders(
  monaco: LspMonacoModule,
  clientRef: LspClientRef,
  options?: LspProviderOptions,
): { dispose(): void } {
  const disposables: { dispose(): void }[] = []

  // Helper: convert Monaco model URI → LSP URI
  const toLsp = (modelUri: string): string =>
    clientRef.current?.toLspUri(modelUri) ?? `file://${modelUri}`

  // Completion
  disposables.push(
    monaco.languages.registerCompletionItemProvider(TS_LANGUAGES, {
      triggerCharacters: ['.', '"', "'", '/', '<'],
      async provideCompletionItems(
        model: { uri: { toString(): string } },
        position: { lineNumber: number; column: number },
      ) {
        if (!clientRef.current?.isConnected()) return { suggestions: [] }
        try {
          const result = await clientRef.current!.completion(
            toLsp(model.uri.toString()),
            position.lineNumber - 1,
            position.column - 1,
          )
          return {
            incomplete: result.isIncomplete,
            suggestions: result.items.map(convertCompletionItem),
          }
        } catch {
          return { suggestions: [] }
        }
      },
    }),
  )

  // Hover
  disposables.push(
    monaco.languages.registerHoverProvider(TS_LANGUAGES, {
      async provideHover(
        model: { uri: { toString(): string } },
        position: { lineNumber: number; column: number },
      ) {
        console.debug('[LSP hover] called', {
          uri: model.uri.toString(),
          connected: clientRef.current?.isConnected() ?? false,
          line: position.lineNumber,
          col: position.column,
        })
        if (!clientRef.current?.isConnected()) return null
        try {
          const result = await clientRef.current!.hover(
            toLsp(model.uri.toString()),
            position.lineNumber - 1,
            position.column - 1,
          )
          console.debug('[LSP hover] result', result ? 'has content' : 'null')
          if (!result) return null
          return {
            contents: convertHoverContents(result.contents),
            range: result.range ? lspToMonacoRange(result.range) : undefined,
          }
        } catch (err) {
          console.debug('[LSP hover] error', err)
          return null
        }
      },
    }),
  )

  // Go-to-definition
  disposables.push(
    monaco.languages.registerDefinitionProvider(TS_LANGUAGES, {
      async provideDefinition(
        model: { uri: { toString(): string } },
        position: { lineNumber: number; column: number },
      ) {
        if (!clientRef.current?.isConnected()) return []
        try {
          const locations = await clientRef.current!.definition(
            toLsp(model.uri.toString()),
            position.lineNumber - 1,
            position.column - 1,
          )
          const results = locations.map((loc) => ({
            uri: monaco.Uri.parse(clientRef.current!.fromLspUri(loc.uri)),
            range: lspToMonacoRange(loc.range),
          }))

          // Pre-create models for targets that don't exist yet (needed for Peek Definition)
          if (options?.resolveModel) {
            for (const r of results) {
              const uriStr = (r.uri as { toString(): string }).toString()
              if (!monaco.editor.getModel(r.uri)) {
                await options.resolveModel(uriStr)
              }
            }
          }

          return results
        } catch {
          return []
        }
      },
    }),
  )

  // Signature help
  disposables.push(
    monaco.languages.registerSignatureHelpProvider(TS_LANGUAGES, {
      signatureHelpTriggerCharacters: ['(', ','],
      async provideSignatureHelp(
        model: { uri: { toString(): string } },
        position: { lineNumber: number; column: number },
      ) {
        if (!clientRef.current?.isConnected()) return null
        try {
          const result = await clientRef.current!.signatureHelp(
            toLsp(model.uri.toString()),
            position.lineNumber - 1,
            position.column - 1,
          )
          if (!result) return null
          return {
            value: {
              signatures: result.signatures.map((sig) => ({
                label: sig.label,
                documentation: sig.documentation
                  ? typeof sig.documentation === 'string'
                    ? { value: sig.documentation }
                    : { value: sig.documentation.value }
                  : undefined,
                parameters: sig.parameters?.map((p) => ({
                  label: p.label,
                  documentation: p.documentation
                    ? typeof p.documentation === 'string'
                      ? { value: p.documentation }
                      : { value: p.documentation.value }
                    : undefined,
                })),
              })),
              activeSignature: result.activeSignature ?? 0,
              activeParameter: result.activeParameter ?? 0,
            },
            dispose() {},
          }
        } catch {
          return null
        }
      },
    }),
  )

  // Diagnostics are registered per-client in connectLsp(), not here,
  // since onNotification is bound to a specific client instance.

  return {
    dispose() {
      for (const d of disposables) d.dispose()
    },
  }
}
