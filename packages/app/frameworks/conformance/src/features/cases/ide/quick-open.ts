/**
 * `QuickOpen` cases: the ⌘P file finder overlay's every state — the loading
 * row while the file list is in flight, the rows themselves (icons, labels,
 * the `/workspace/`-stripped details), the empty and failing replies, the
 * selection that opens the file and dismisses, the dismissal paths (row,
 * Escape, backdrop) that open nothing, the typed query through the fuzzy
 * filter, the replaced `projectId` that re-fetches, the unmount that leaves a
 * late reply unapplied, and the theme, viewport, pointer and locale branches.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The file list a successful reply returns; one nested, one bare, one outside `/workspace`. */
const FILES = [
  '/workspace/src/App.tsx',
  '/workspace/src/main.tsx',
  '/workspace/README.md',
  '/assets/logo.svg',
]

/** The `GET` that loads the list of project `p1`. */
const P1_LIST = { method: 'GET', url: '/projects/p1/files-list' }

/** `QuickOpen`. */
export const quickOpenCases: FeatureComponentCases = {
  component: 'QuickOpen',
  cases: [
    // ── The reply ───────────────────────────────────────────────────────────
    {
      name: 'no files yet',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: [] } }] },
    },
    {
      name: 'the rows arrive after the loading state',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, status: 200, data: { files: FILES }, defer: true }] },
      interactions: [{ type: 'http', ...P1_LIST, status: 200, data: { files: FILES } }],
    },

    // ── Selecting and dismissing ────────────────────────────────────────────
    {
      name: 'clicking a row opens its file and dismisses',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="quick-picker-item-/workspace/src/App.tsx"]' },
      ],
    },
    {
      name: 'typing filters the rows and Enter opens the top match',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      interactions: [
        { type: 'input', selector: 'input[type="text"]', value: 'tsx' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },
    {
      name: 'Escape dismisses without opening',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      interactions: [{ type: 'keydown', selector: 'input[type="text"]', key: 'Escape' }],
    },
    {
      name: 'clicking the backdrop dismisses without opening',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      interactions: [
        { type: 'click', selector: 'div[role="presentation"]:has(> [role="dialog"])' },
      ],
    },

    // ── The project input ───────────────────────────────────────────────────
    {
      name: 'a replaced projectId re-fetches the list',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: {
        http: [
          { ...P1_LIST, data: { files: FILES } },
          {
            method: 'GET',
            url: '/projects/p2/files-list',
            status: 200,
            data: { files: ['/workspace/index.html'] },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'props', props: { projectId: 'p2' } },
        {
          type: 'http',
          method: 'GET',
          url: '/projects/p2/files-list',
          status: 200,
          data: { files: ['/workspace/index.html'] },
        },
      ],
    },
    {
      name: 'an unmount leaves the late reply unapplied',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, status: 200, data: { files: FILES }, defer: true }] },
      interactions: [
        { type: 'unmount' },
        { type: 'http', ...P1_LIST, status: 200, data: { files: FILES } },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-renders the placeholder',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: {
        http: [{ ...P1_LIST, data: { files: [] } }],
        locale: 'en',
        translations: {
          en: { ide: { quickOpen: { placeholder: 'Search files by name…' } } },
          fr: { ide: { quickOpen: { placeholder: 'Rechercher des fichiers par nom…' } } },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },

    // ── Theme, viewport, pointer ────────────────────────────────────────────
    {
      name: 'the dark theme tints the panel and the selected row',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }], theme: 'dark' },
    },
    {
      name: 'a narrow viewport anchors the picker near the top of the screen',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      viewportWidth: 390,
    },
    {
      name: 'a coarse pointer enlarges the input text',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ ...P1_LIST, data: { files: FILES } }] },
      pointer: 'coarse',
    },
  ],
}
