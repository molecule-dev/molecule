/**
 * Quill rich text provider implementation.
 *
 * @module
 */

import Quill from 'quill'
import type Delta from 'quill-delta'

import { createQuillEditor } from './editor.js'
import { quillToolbars, toolbarConfigToQuill } from './toolbars.js'
import type {
  EditorOptions,
  QuillOptions,
  RichTextEditor,
  RichTextProvider,
  RichTextValue,
  ToolbarConfig,
} from './types.js'

/**
 * Creates a Quill-based rich text provider implementing the molecule `RichTextProvider` interface.
 * Supports toolbar presets (`minimal`, `standard`, `full`), HTML/text/delta value conversion,
 * and Quill themes (`snow`, `bubble`).
 * @param defaultOptions - Default Quill options applied to every editor created by this provider.
 * @returns A `RichTextProvider` backed by Quill.
 */
export const createQuillProvider = (defaultOptions?: Partial<QuillOptions>): RichTextProvider => {
  return {
    getName: () => 'quill',

    getToolbarPresets: () => quillToolbars,

    createEmptyValue: (): RichTextValue => ({
      text: '',
      html: '',
      delta: { ops: [] },
    }),

    htmlToValue: (html: string): RichTextValue => {
      // Create a temporary element to extract text
      const div = document.createElement('div')
      div.innerHTML = html
      return {
        text: div.textContent || '',
        html,
        delta: undefined, // Would need a Quill instance to convert
      }
    },

    textToValue: (text: string): RichTextValue => ({
      text,
      html: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
      delta: { ops: [{ insert: text + '\n' }] },
    }),

    createEditor: (options: EditorOptions): RichTextEditor => {
      const mergedOptions = { ...defaultOptions, ...options } as QuillOptions
      const {
        container,
        value,
        placeholder,
        readOnly,
        toolbar,
        theme = 'snow',
        modules = {},
      } = mergedOptions as Omit<EditorOptions, 'toolbar'> &
        QuillOptions & { toolbar?: EditorOptions['toolbar'] | false }

      // Build toolbar configuration
      let toolbarConfig: unknown[][] | boolean | string | undefined
      if (toolbar === false) {
        toolbarConfig = false
      } else if (typeof toolbar === 'string' && quillToolbars[toolbar]) {
        toolbarConfig = toolbarConfigToQuill(quillToolbars[toolbar])
      } else if (toolbar && typeof toolbar === 'object' && 'groups' in toolbar) {
        toolbarConfig = toolbarConfigToQuill(toolbar as ToolbarConfig)
      } else {
        toolbarConfig = toolbarConfigToQuill(quillToolbars.standard)
      }

      // Create Quill instance
      const quill = new Quill(container, {
        theme,
        placeholder,
        readOnly,
        modules: {
          toolbar: toolbarConfig,
          ...modules,
        },
        ...mergedOptions,
      })

      // Set initial value
      if (value) {
        if (value.delta) {
          quill.setContents(value.delta as Delta, 'silent')
        } else if (value.html) {
          quill.root.innerHTML = value.html
        } else if (value.text) {
          quill.setText(value.text, 'silent')
        }
      }

      return createQuillEditor(quill, container)
    },
  }
}

/** Default Quill rich text provider instance. */
export const provider = createQuillProvider()
