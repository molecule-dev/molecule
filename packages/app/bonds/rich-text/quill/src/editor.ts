/**
 * Quill editor wrapper implementation.
 *
 * @module
 */

import type Quill from 'quill'
import type Delta from 'quill-delta'

import type {
  EditorEvent,
  EditorEventHandler,
  FormatType,
  RichTextEditor,
  RichTextValue,
  SelectionChangeData,
  SelectionRange,
  TextChangeData,
} from './types.js'

/**
 * Wraps a Quill instance in a molecule `RichTextEditor` interface. Sets up event listeners
 * for text changes, selection changes, focus, and blur, and exposes a unified API for
 * content manipulation, formatting, and selection management.
 * @param quill - The initialized Quill editor instance.
 * @param container - The DOM element containing the Quill editor (used for cleanup on destroy).
 * @returns A `RichTextEditor` with getValue/setValue, formatting, selection, and event methods.
 */
export const createQuillEditor = (quill: Quill, container: HTMLElement): RichTextEditor => {
  const eventHandlers = new Map<EditorEvent, Set<EditorEventHandler>>()

  const emit = <T>(event: EditorEvent, data: T): void => {
    eventHandlers.get(event)?.forEach((handler) => handler(data))
  }

  const getValue = (): RichTextValue => ({
    text: quill.getText(),
    html: quill.root.innerHTML,
    delta: quill.getContents(),
  })

  let previousValue = getValue()

  // Set up Quill event handlers
  quill.on('text-change', (_delta: Delta, _oldDelta: Delta, source: string) => {
    const newValue = getValue()
    emit<TextChangeData>('text-change', {
      value: newValue,
      previousValue,
      source: source as 'user' | 'api' | 'silent',
    })
    previousValue = newValue
  })

  quill.on(
    'selection-change',
    (
      range: { index: number; length: number } | null,
      oldRange: { index: number; length: number } | null,
      source: string,
    ) => {
      emit<SelectionChangeData>('selection-change', {
        range: range ? { index: range.index, length: range.length } : null,
        previousRange: oldRange ? { index: oldRange.index, length: oldRange.length } : null,
        source: source as 'user' | 'api' | 'silent',
      })
    },
  )

  quill.root.addEventListener('focus', () => emit('focus', undefined))
  quill.root.addEventListener('blur', () => emit('blur', undefined))

  return {
    getValue,

    setValue: (value: RichTextValue): void => {
      const prev = getValue()
      if (value.delta) {
        quill.setContents(value.delta as Delta, 'api')
      } else if (value.html) {
        quill.root.innerHTML = value.html
      } else {
        quill.setText(value.text, 'api')
      }
      previousValue = getValue()
      emit<TextChangeData>('text-change', {
        value: previousValue,
        previousValue: prev,
        source: 'api',
      })
    },

    getText: () => quill.getText(),
    getHTML: () => quill.root.innerHTML,
    getLength: () => quill.getLength(),

    insertText: (text: string, index?: number): void => {
      const insertIndex = index ?? quill.getSelection()?.index ?? quill.getLength()
      quill.insertText(insertIndex, text, 'user')
    },

    insertHTML: (html: string, index?: number): void => {
      const insertIndex = index ?? quill.getSelection()?.index ?? quill.getLength()
      quill.clipboard.dangerouslyPasteHTML(insertIndex, html, 'user')
    },

    insertEmbed: (type: string, value: unknown, index?: number): void => {
      const insertIndex = index ?? quill.getSelection()?.index ?? quill.getLength()
      quill.insertEmbed(insertIndex, type, value, 'user')
    },

    deleteText: (index: number, length: number): void => {
      quill.deleteText(index, length, 'user')
    },

    format: (format: FormatType, value?: unknown): void => {
      quill.format(format, value ?? true, 'user')
    },

    formatText: (index: number, length: number, format: FormatType, value?: unknown): void => {
      quill.formatText(index, length, format, value ?? true, 'user')
    },

    removeFormat: (index: number, length: number): void => {
      quill.removeFormat(index, length, 'user')
    },

    getSelection: (): SelectionRange | null => {
      const range = quill.getSelection()
      return range ? { index: range.index, length: range.length } : null
    },

    setSelection: (index: number, length = 0): void => {
      quill.setSelection(index, length, 'user')
    },

    focus: () => quill.focus(),
    blur: () => quill.blur(),
    hasFocus: () => quill.hasFocus(),

    enable: () => quill.enable(),
    disable: () => quill.disable(),
    isEnabled: () => quill.isEnabled(),

    on: <T>(event: EditorEvent, handler: EditorEventHandler<T>): (() => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler as EditorEventHandler)
      return () => eventHandlers.get(event)?.delete(handler as EditorEventHandler)
    },

    off: <T>(event: EditorEvent, handler: EditorEventHandler<T>): void => {
      eventHandlers.get(event)?.delete(handler as EditorEventHandler)
    },

    getEditorInstance: () => quill,

    destroy: (): void => {
      eventHandlers.clear()
      // Quill doesn't have a destroy method, but we can clean up
      container.innerHTML = ''
    },
  }
}
