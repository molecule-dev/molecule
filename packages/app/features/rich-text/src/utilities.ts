/**
 * Rich text editor utilities for molecule.dev.
 *
 * @module
 */

import type { ToolbarConfig } from './types.js'

/**
 * Default toolbar presets.
 */
export const defaultToolbars: Record<string, ToolbarConfig> = {
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
    ],
  },
  full: {
    name: 'full',
    groups: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ type: 'list', options: ['ordered', 'bullet'] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [
        { type: 'color', options: [] },
        { type: 'background', options: [] },
      ],
      [{ type: 'align', options: [] }],
      [{ type: 'script', options: ['sub', 'super'] }],
      [{ type: 'indent', options: ['-1', '+1'] }],
      [{ type: 'direction', options: ['rtl'] }],
      [{ type: 'header', options: [1, 2, 3, 4, 5, 6, false] }],
      [{ type: 'font', options: [] }],
      ['clean'],
    ],
  },
}
