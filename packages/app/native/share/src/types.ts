/**
 * `@molecule/app-share`
 * Type definitions for share module.
 */

/**
 * Share content options
 */
export interface ShareContent {
  /** Title of the shared content */
  title?: string
  /** Text content to share */
  text?: string
  /** URL to share */
  url?: string
  /** Dialog title (Android only) */
  dialogTitle?: string
}

/**
 * A file attachment for sharing, with path/URI, MIME type, and display name.
 */
export interface ShareFile {
  /** File path or URI */
  path: string
  /** MIME type of the file */
  mimeType?: string
  /** Display name for the file */
  name?: string
}

/**
 * Share options including files
 */
export interface ShareOptions extends ShareContent {
  /** Files to share */
  files?: ShareFile[]
}

/**
 * Result of a share operation: completion status, chosen activity/app, and any error.
 */
export interface ShareResult {
  /** Whether sharing was completed successfully */
  completed: boolean
  /** Activity type that was used (iOS) or package name (Android) */
  activityType?: string
  /** Error message if sharing failed */
  error?: string
}

/**
 * Share capabilities
 */
export interface ShareCapabilities {
  /** Whether sharing is supported */
  supported: boolean
  /** Whether file sharing is supported */
  fileSharing: boolean
  /** Whether multiple files can be shared */
  multipleFiles: boolean
  /** Supported MIME types (if available) */
  supportedMimeTypes?: string[]
}

/**
 * Share provider interface
 */
export interface ShareProvider {
  /**
   * Share content using the native share sheet.
   * @param options - Content, files, and dialog configuration to share.
   * @returns The share result indicating completion status and activity type.
   */
  share(options: ShareOptions): Promise<ShareResult>

  /**
   * Share text content via the native share sheet.
   * @param text - The text content to share.
   * @param title - Optional title for the share dialog.
   * @returns The share result indicating completion status and activity type.
   */
  shareText(text: string, title?: string): Promise<ShareResult>

  /**
   * Share a URL via the native share sheet.
   * @param url - The URL to share.
   * @param title - Optional title for the share dialog.
   * @returns The share result indicating completion status and activity type.
   */
  shareUrl(url: string, title?: string): Promise<ShareResult>

  /**
   * Share one or more files via the native share sheet.
   * @param files - The files to share, with paths and optional MIME types.
   * @param options - Additional share content (title, text, URL) to include.
   * @returns The share result indicating completion status and activity type.
   */
  shareFiles(files: ShareFile[], options?: ShareContent): Promise<ShareResult>

  /**
   * Check if the native share sheet is available on this platform.
   * @returns Whether sharing is supported.
   */
  canShare(): Promise<boolean>

  /**
   * Check if the given content (text, URL, files) can be shared on this platform.
   * @param options - The share options to validate.
   * @returns Whether the specified content can be shared.
   */
  canShareContent(options: ShareOptions): Promise<boolean>

  /**
   * Get the platform's sharing capabilities.
   * @returns The capabilities indicating file sharing support and allowed MIME types.
   */
  getCapabilities(): Promise<ShareCapabilities>
}
