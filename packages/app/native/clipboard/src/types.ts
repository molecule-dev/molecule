/**
 * `@molecule/app-clipboard`
 * Type definitions for clipboard access interface
 */

/**
 * Clipboard data types
 */
export type ClipboardDataType = 'text/plain' | 'text/html' | 'image/png' | 'image/jpeg' | string

/**
 * Clipboard content
 */
export interface ClipboardContent {
  /** Plain text content */
  text?: string
  /** HTML content */
  html?: string
  /** Image as base64 data URL or blob */
  image?: string | Blob
  /** URL content */
  url?: string
  /** Raw data with MIME type */
  data?: {
    type: ClipboardDataType
    value: string | Blob | ArrayBuffer
  }
}

/**
 * Options for writing to the clipboard (label, confirmation toast).
 */
export interface WriteOptions {
  /** Label for the content (used by some platforms) */
  label?: string
  /** Whether to show a confirmation (if platform supports) */
  showConfirmation?: boolean
}

/**
 * Options for reading from the clipboard (preferred MIME types in priority order).
 */
export interface ReadOptions {
  /** Preferred data types to read (in order of preference) */
  preferredTypes?: ClipboardDataType[]
}

/**
 * Clipboard capabilities
 */
export interface ClipboardCapabilities {
  /** Whether clipboard access is supported */
  supported: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether image reading is supported */
  canReadImage: boolean
  /** Whether image writing is supported */
  canWriteImage: boolean
  /** Whether HTML is supported */
  canReadHtml: boolean
  /** Available data types */
  availableTypes?: ClipboardDataType[]
}

/**
 * Clipboard change event
 */
export interface ClipboardChangeEvent {
  /** Whether clipboard has content */
  hasContent: boolean
  /** Available content types */
  types: ClipboardDataType[]
}

/**
 * Clipboard provider interface
 */
export interface ClipboardProvider {
  /**
   * Write content to clipboard
   * @param content - Content to write
   * @param options - Write options
   */
  write(content: ClipboardContent, options?: WriteOptions): Promise<void>

  /**
   * Write plain text to clipboard
   * @param text - Text to write
   */
  writeText(text: string): Promise<void>

  /**
   * Write HTML to clipboard
   * @param html - HTML to write
   * @param fallbackText - Plain text fallback
   */
  writeHtml(html: string, fallbackText?: string): Promise<void>

  /**
   * Write image to clipboard
   * @param image - Image as base64 data URL or Blob
   */
  writeImage(image: string | Blob): Promise<void>

  /**
   * Read content from clipboard
   * @param options - Read options
   */
  read(options?: ReadOptions): Promise<ClipboardContent>

  /**
   * Read plain text from clipboard
   */
  readText(): Promise<string>

  /**
   * Read HTML from clipboard
   */
  readHtml(): Promise<string | null>

  /**
   * Read image from clipboard
   */
  readImage(): Promise<string | null>

  /**
   * Clear the clipboard
   */
  clear(): Promise<void>

  /**
   * Check if clipboard has content
   * @returns Whether the clipboard currently has content.
   */
  hasContent(): Promise<boolean>

  /**
   * Get available content types in clipboard
   * @returns The list of MIME types available in the clipboard.
   */
  getAvailableTypes(): Promise<ClipboardDataType[]>

  /**
   * Get clipboard capabilities
   * @returns The clipboard capabilities indicating supported operations.
   */
  getCapabilities(): Promise<ClipboardCapabilities>

  /**
   * Listen for clipboard changes (if supported)
   * @param callback - Called when clipboard content changes
   * @returns Unsubscribe function
   */
  onChange?(callback: (event: ClipboardChangeEvent) => void): () => void
}
