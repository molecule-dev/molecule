/**
 * Quill rich text provider implementation.
 *
 * @module
 */

import DOMPurify from 'dompurify'
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
      // Sanitize BEFORE innerHTML: even on a detached element, innerHTML fires
      // resource-load handlers (<img src=x onerror>, <svg onload>), so raw untrusted
      // HTML here is a stored-XSS sink. Mirror the simple provider's P5FE-10 fix and
      // return the sanitized html so downstream renders are safe too. [P5FE-30]
      const clean = DOMPurify.sanitize(html)
      const div = document.createElement('div')
      div.innerHTML = clean
      return {
        text: div.textContent || '',
        html: clean,
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
        ...rest
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

      // Create Quill instance.
      // Spread the pass-through Quill options (`...rest`: formats, debug, etc.)
      // FIRST, then set the resolved fields last so nothing clobbers them. In
      // particular, `modules` merges the caller's modules UNDER the derived
      // toolbar preset (`{ toolbar, ...modules }`) so a caller-provided `modules`
      // object never wipes the toolbar; pass `modules.toolbar` explicitly to
      // override the preset. `container`/`value`/`toolbar` are molecule-only keys
      // excluded from `...rest`, so they don't leak into Quill's options.
      const quill = new Quill(container, {
        ...rest,
        theme,
        placeholder,
        readOnly,
        modules: {
          toolbar: toolbarConfig,
          ...modules,
        },
      })

      // Set initial value
      if (value) {
        if (value.delta) {
          quill.setContents(value.delta as Delta, 'silent')
        } else if (value.html) {
          // Load stored HTML through Quill's clipboard allowlist (not raw innerHTML)
          // so persisted content can't carry <script>/onerror XSS. [P5FE-01 secure-by-default]
          quill.clipboard.dangerouslyPasteHTML(value.html, 'silent')
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
