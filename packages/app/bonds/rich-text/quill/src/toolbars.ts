/**
 * Toolbar presets for Quill editor.
 *
 * @module
 */

import type { ToolbarConfig } from './types.js'

/**
 * Default toolbar presets for Quill.
 */
export const quillToolbars: Record<string, ToolbarConfig> = {
  minimal: {
    name: 'minimal',
    groups: [
      ['bold', 'italic', 'underline'],
      [{ type: 'header', options: [1, 2] }],
      [{ type: 'list', options: ['ordered', 'bullet'] }],
      ['link', 'image'],
    ],
  },
  standard: {
    name: 'standard',
    groups: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ type: 'header', options: [1, 2, 3] }],
      [{ type: 'list', options: ['ordered', 'bullet'] }],
      ['link', 'image', 'blockquote', 'code-block'],
      [{ type: 'align', options: [] }],
      ['clean'],
    ],
  },
  full: {
    name: 'full',
    groups: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ type: 'list', options: ['ordered', 'bullet'] }],
      [{ type: 'script', options: ['sub', 'super'] }],
      [{ type: 'indent', options: ['-1', '+1'] }],
      [{ type: 'direction', options: ['rtl'] }],
      [{ type: 'header', options: [1, 2, 3, 4, 5, 6, false] }],
      [
        { type: 'color', options: [] },
        { type: 'background', options: [] },
      ],
      [{ type: 'font', options: [] }],
      [{ type: 'align', options: [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean'],
    ],
  },
}

/**
 * Converts a molecule `ToolbarConfig` to Quill's native toolbar array format.
 * Each group becomes a sub-array; string items pass through, objects become `{ type: options }` entries.
 * @param config - A molecule toolbar config with named groups of toolbar items.
 * @returns A nested array in Quill's toolbar module format.
 */
export const toolbarConfigToQuill = (config: ToolbarConfig): unknown[][] => {
  return config.groups.map((group) =>
    group.map((item) => {
      if (typeof item === 'string') {
        return item
      }
      if (item.options && item.options.length > 0) {
        return { [item.type]: item.options }
      }
      return { [item.type]: [] }
    }),
  )
}
