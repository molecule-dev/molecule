/**
 * Simple rich text editor implementation for molecule.dev.
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
  TextChangeData,
} from './types.js'
import { defaultToolbars } from './utilities.js'

/**
 * Create a simple contentEditable-based rich text provider. This is a basic
 * fallback — for production use, prefer dedicated providers like
 * `@molecule/app-rich-text-quill` or `@molecule/app-rich-text-tiptap`.
 * @returns A RichTextProvider using the browser's contentEditable API.
 */
export const createSimpleRichTextProvider = (): RichTextProvider => {
  return {
    getName: () => 'simple',

    getToolbarPresets: () => defaultToolbars,

    createEmptyValue: () => ({
      text: '',
      html: '',
    }),

    htmlToValue: (html: string) => {
      const div = document.createElement('div')
      div.innerHTML = html
      return {
        text: div.textContent || '',
        html,
      }
    },

    textToValue: (text: string) => ({
      text,
      html: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
    }),

    createEditor: (options: EditorOptions): RichTextEditor => {
      const { container, value, placeholder, readOnly } = options

      // Create content-editable div
      const editorEl = document.createElement('div')
      editorEl.contentEditable = readOnly ? 'false' : 'true'
      editorEl.innerHTML = value?.html || ''
      editorEl.setAttribute('data-placeholder', placeholder || '')
      editorEl.style.minHeight = '100px'
      editorEl.style.padding = '8px'
      editorEl.style.border = '1px solid #ccc'
      editorEl.style.borderRadius = '4px'
      editorEl.style.outline = 'none'
      container.appendChild(editorEl)

      const eventHandlers = new Map<string, Set<EditorEventHandler>>()
      let enabled = !readOnly

      const emit = <T>(event: EditorEvent, data: T): void => {
        eventHandlers.get(event)?.forEach((handler) => handler(data))
      }

      const getValue = (): RichTextValue => ({
        text: editorEl.textContent || '',
        html: editorEl.innerHTML,
      })

      let previousValue = getValue()

      editorEl.addEventListener('input', () => {
        const newValue = getValue()
        emit<TextChangeData>('text-change', {
          value: newValue,
          previousValue,
          source: 'user',
        })
        previousValue = newValue
      })

      editorEl.addEventListener('focus', () => emit('focus', undefined))
      editorEl.addEventListener('blur', () => emit('blur', undefined))

      return {
        getValue,

        setValue: (newValue: RichTextValue) => {
          const prev = getValue()
          editorEl.innerHTML = newValue.html
          previousValue = newValue
          emit<TextChangeData>('text-change', {
            value: newValue,
            previousValue: prev,
            source: 'api',
          })
        },

        getText: () => editorEl.textContent || '',
        getHTML: () => editorEl.innerHTML,
        getLength: () => (editorEl.textContent || '').length,

        insertText: (text: string) => {
          document.execCommand('insertText', false, text)
        },

        insertHTML: (html: string) => {
          document.execCommand('insertHTML', false, html)
        },

        insertEmbed: (type: string, embedValue: unknown) => {
          if (type === 'image' && typeof embedValue === 'string') {
            document.execCommand('insertImage', false, embedValue)
          }
        },

        deleteText: () => {
          document.execCommand('delete')
        },

        format: (format: FormatType) => {
          const commandMap: Record<string, string> = {
            bold: 'bold',
            italic: 'italic',
            underline: 'underline',
            strike: 'strikeThrough',
          }
          const command = commandMap[format]
          if (command) {
            document.execCommand(command)
          }
        },

        formatText: () => {
          // Not fully supported in simple implementation
        },

        removeFormat: () => {
          document.execCommand('removeFormat')
        },

        getSelection: () => {
          const selection = window.getSelection()
          if (!selection || selection.rangeCount === 0) return null

          const range = selection.getRangeAt(0)
          if (!container.contains(range.commonAncestorContainer)) return null

          return {
            index: range.startOffset,
            length: range.toString().length,
          }
        },

        setSelection: (index: number, length = 0) => {
          const range = document.createRange()
          const selection = window.getSelection()
          if (!selection) return

          const textNode = editorEl.firstChild
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            range.setStart(textNode, Math.min(index, textNode.textContent?.length || 0))
            range.setEnd(textNode, Math.min(index + length, textNode.textContent?.length || 0))
            selection.removeAllRanges()
            selection.addRange(range)
          }
        },

        focus: () => editorEl.focus(),
        blur: () => editorEl.blur(),
        hasFocus: () => document.activeElement === editorEl,

        enable: () => {
          enabled = true
          editorEl.contentEditable = 'true'
        },

        disable: () => {
          enabled = false
          editorEl.contentEditable = 'false'
        },

        isEnabled: () => enabled,

        on: <T>(event: EditorEvent, handler: EditorEventHandler<T>) => {
          if (!eventHandlers.has(event)) {
            eventHandlers.set(event, new Set())
          }
          eventHandlers.get(event)!.add(handler as EditorEventHandler)
          return () => eventHandlers.get(event)?.delete(handler as EditorEventHandler)
        },

        off: <T>(event: EditorEvent, handler: EditorEventHandler<T>) => {
          eventHandlers.get(event)?.delete(handler as EditorEventHandler)
        },

        getEditorInstance: () => editorEl,

        destroy: () => {
          eventHandlers.clear()
          editorEl.remove()
        },
      }
    },
  }
}
