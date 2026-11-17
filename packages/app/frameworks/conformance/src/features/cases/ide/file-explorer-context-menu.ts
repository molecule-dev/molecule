/**
 * Cases for the IDE's `FileExplorerContextMenu` — the right-click menu of the
 * file explorer, portalled into `document.body` by every framework. The cases
 * cover each of the four menu shapes (background, multi-select, directory,
 * file), what read-only mode (a project viewer) removes from each — every
 * mutating entry, copy-path and collapse-all kept — and what paste adds when
 * the clipboard holds a cut; the item actuations (click, `Enter`, `Space`),
 * the keys that do nothing, the `Escape`-anywhere and pointer-press-outside
 * closes, the clamp of a menu that would render past the viewport edge, and a
 * locale switch re-labelling the rows.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The empty mount wrapper: outside the portalled menu, so a press on it is an outside press. */
const OUTSIDE = '[data-parity-unwrap]'
/** One menu row, by the action it acts. */
const row = (action: string): string => `[data-mol-id="file-context-${action}"]`
/** A file node, as the explorer hands one over. */
const FILE = { name: 'a.ts', path: 'src/a.ts', type: 'file' }
/** A directory node with one child, as the explorer hands one over. */
const DIRECTORY = {
  name: 'src',
  path: 'src',
  type: 'directory',
  children: [{ name: 'a.ts', path: 'src/a.ts', type: 'file' }],
}

/** `FileExplorerContextMenu`. */
export const fileExplorerContextMenuCases: FeatureComponentCases = {
  component: 'FileExplorerContextMenu',
  cases: [
    // ── Background (right-click on the empty area) ──────────────────────────
    {
      name: 'a background menu offers a new file, a new folder and collapse all',
      props: { position: { x: 12, y: 24 }, node: null, selectedCount: 0, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'click', selector: row('newFile') },
        { type: 'click', selector: row('newFolder') },
        { type: 'click', selector: row('collapseAll') },
      ],
    },
    {
      name: 'a background menu offers paste when the clipboard holds a cut',
      props: {
        position: { x: 12, y: 24 },
        node: null,
        selectedCount: 0,
        canPaste: true,
        readOnly: false,
      },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('paste') }],
    },
    {
      name: 'a read-only background menu keeps collapse all',
      props: {
        position: { x: 12, y: 24 },
        node: null,
        selectedCount: 0,
        canPaste: true,
        readOnly: true,
      },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('collapseAll') }],
    },

    // ── Multi-select (two or more items selected) ───────────────────────────
    {
      name: 'a multi-select menu deletes, cuts and copies the selection',
      props: { position: { x: 40, y: 60 }, node: FILE, selectedCount: 3, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'click', selector: row('deleteMultiple') },
        { type: 'keydown', selector: row('copyRelativePaths'), key: 'Enter' },
        // A key that is neither Enter nor Space acts on nothing.
        { type: 'keydown', selector: row('copyPaths'), key: 'End' },
      ],
    },
    {
      name: 'a multi-select menu offers paste when the clipboard holds a cut',
      props: { position: { x: 40, y: 60 }, node: FILE, selectedCount: 2, canPaste: true },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('copyPaths') }],
    },
    {
      name: 'a read-only multi-select menu keeps the copies and collapse all',
      props: {
        position: { x: 40, y: 60 },
        node: FILE,
        selectedCount: 3,
        canPaste: true,
        readOnly: true,
      },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('copyRelativePaths') }],
    },

    // ── Directory (single selection) ────────────────────────────────────────
    {
      name: 'a directory menu creates, renames and copies',
      props: { position: { x: 80, y: 100 }, node: DIRECTORY, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'keydown', selector: row('rename'), key: 'Enter' },
        { type: 'keydown', selector: row('copyRelativePath'), key: ' ' },
        { type: 'click', selector: row('delete') },
      ],
    },
    {
      name: 'a directory menu offers paste when the clipboard holds a cut',
      props: { position: { x: 80, y: 100 }, node: DIRECTORY, selectedCount: 1, canPaste: true },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('cut') }],
    },
    {
      name: 'a read-only directory menu keeps copying and collapse all',
      props: {
        position: { x: 80, y: 100 },
        node: DIRECTORY,
        selectedCount: 1,
        canPaste: true,
        readOnly: true,
      },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('copyPath') }],
    },

    // ── File (single selection) ─────────────────────────────────────────────
    {
      name: 'a file menu opens, renames and copies',
      props: { position: { x: 100, y: 140 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'click', selector: row('open') },
        { type: 'keydown', selector: row('copyPath'), key: 'Enter' },
      ],
    },
    {
      name: 'a file menu offers paste when the clipboard holds a cut',
      props: { position: { x: 100, y: 140 }, node: FILE, selectedCount: 1, canPaste: true },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('paste') }],
    },
    {
      name: 'a read-only file menu keeps open and the copies',
      props: {
        position: { x: 100, y: 140 },
        node: FILE,
        selectedCount: 1,
        canPaste: true,
        readOnly: true,
      },
      callbacks: ['onAction', 'onClose'],
      interactions: [{ type: 'click', selector: row('copyRelativePath') }],
    },

    // ── Close paths ─────────────────────────────────────────────────────────
    {
      name: 'escape closes from anywhere and other keys do nothing',
      props: { position: { x: 20, y: 30 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'keydown', selector: row('open'), key: 'Escape' },
        { type: 'keydown', selector: OUTSIDE, key: 'a' },
        { type: 'keydown', selector: OUTSIDE, key: 'Escape' },
      ],
    },
    {
      name: 'a pointer press outside closes the menu and one inside does not',
      props: { position: { x: 20, y: 30 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      interactions: [
        { type: 'pointerdown', selector: row('open') },
        { type: 'pointerdown', selector: OUTSIDE },
        { type: 'pointerdown', selector: row('open') },
      ],
    },

    // ── Clamping ────────────────────────────────────────────────────────────
    {
      name: 'a menu past the right edge is clamped inside it at mount',
      props: { position: { x: 1100, y: 600 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      viewportWidth: 800,
      layout: [{ selector: '[role="menu"]', rect: { width: 300, height: 400 } }],
      interactions: [{ type: 'props', props: { position: { x: -50, y: -50 } } }],
    },
    {
      name: 'a moved menu measures its laid-out box and clamps inside the viewport',
      props: { position: { x: 20, y: 30 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      viewportWidth: 800,
      layout: [{ selector: '[role="menu"]', rect: { width: 300, height: 400 } }],
      interactions: [
        { type: 'props', props: { position: { x: 1100, y: 600 } } },
        { type: 'props', props: { position: { x: -50, y: -50 } } },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the rows and switching back restores them',
      props: { position: { x: 100, y: 140 }, node: FILE, selectedCount: 1, canPaste: false },
      callbacks: ['onAction', 'onClose'],
      context: {
        translations: {
          fr: {
            ide: {
              contextMenu: {
                open: 'Ouvrir',
                rename: 'Renommer',
              },
            },
          },
        },
      },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'locale', locale: 'en' },
      ],
    },
  ],
}
