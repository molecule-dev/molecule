/**
 * Type definitions for Quill rich text editor provider.
 *
 * @module
 */

import type {
  EditorEvent,
  EditorEventHandler,
  EditorOptions,
  FormatType,
  RichTextEditor,
  RichTextProvider,
  RichTextValue,
  SelectionChangeData,
  SelectionRange,
  TextChangeData,
  ToolbarConfig,
} from '@molecule/app-rich-text'

// Re-export core types
export type {
  EditorEvent,
  EditorEventHandler,
  EditorOptions,
  FormatType,
  RichTextEditor,
  RichTextProvider,
  RichTextValue,
  SelectionChangeData,
  SelectionRange,
  TextChangeData,
  ToolbarConfig,
}

/**
 * Quill-specific configuration options.
 */
export interface QuillOptions extends EditorOptions {
  /**
   * Quill theme ('snow' or 'bubble').
   */
  theme?: 'snow' | 'bubble'

  /**
   * Enable/disable specific formats.
   */
  formats?: FormatType[]

  /**
   * Quill module configurations.
   */
  modules?: {
    toolbar?: boolean | string | unknown[] | Record<string, unknown>
    history?: { delay?: number; maxStack?: number; userOnly?: boolean }
    clipboard?: { matchVisual?: boolean }
    keyboard?: Record<string, unknown>
    [key: string]: unknown
  }

  /**
   * Scroll container element.
   */
  scrollingContainer?: HTMLElement | string | null

  /**
   * Strict mode (limit user input to editor's capabilities).
   */
  strict?: boolean

  /**
   * Debug mode.
   */
  debug?: 'error' | 'warn' | 'log' | false
}
