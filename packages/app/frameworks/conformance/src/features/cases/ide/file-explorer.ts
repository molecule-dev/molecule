/**
 * `FileExplorer` cases: the tree as it opens and sorts, the expand/collapse
 * state and the directory fetch that fills it, the persisted key, the active
 * file's ancestors and its highlight, git statuses and their roll-up to the
 * directory, symlinks (a file's target is opened, a directory's target is
 * revealed), the dimmed entry, every selection path (plain, ctrl, shift,
 * shift+ctrl, space, Escape, select-all, arrow navigation with and without a
 * modifier, ArrowRight/ArrowLeft/Enter, Delete/Backspace, F2), the context
 * menu of a file, a directory, a multi-selection, the background and the
 * read-only project, the drag-and-drop move list (onto a directory, onto the
 * empty area, refused onto itself, a drag that selects an unselected row), the
 * coarse-pointer rows and their long-press menu, a pruned selection after the
 * tree shrinks, a props update that keeps the focus, a tree with no callbacks
 * wired, and a locale switch.
 *
 * Three branches cannot be driven through the kit in jsdom, and React's own
 * unit suite does not cover them either, so they are the port's untested edge:
 *
 * - The system clipboard: jsdom has no `navigator.clipboard`, and the component
 *   calls `navigator.clipboard.writeText` unguarded, so any copy/cut path
 *   (Ctrl+C, Ctrl+X, and the menu's Copy Path, Copy Paths, Copy Relative Path,
 *   Copy Relative Paths and Cut entries) throws
 *   `TypeError: Cannot read properties of undefined (reading 'writeText')`.
 *   The in-app clipboard those paths set has no other writer, so the paste and
 *   Ctrl+V flows are unreachable here too; the move list they produce is the
 *   same one the drag-and-drop cases below exercise.
 * - The long-press move tolerance: a press that drifts cancels the pending
 *   long-press, but the kit's pointer steps are mouse pointers (ignored by the
 *   recognizer) and its `event` step carries no coordinates.
 * - The persisted expand state's RESTORE path: `getPreferenceStore()` memoizes
 *   one store per process from whichever storage provider was bonded at its
 *   first use, so a case's `context.storage` seed never reaches it. The
 *   `persistKey` cases below drive the load, the save and the re-subscribe on a
 *   key change.
 *
 * @module
 */

import type { FileNode } from '@molecule/app-ide-panel-logic'

import type { FeatureComponentCases } from '../../spec.js'

/** The row of one path. */
const row = (path: string): string => `[data-explorer-path="${path}"]`

/** One menu entry. */
const entry = (action: string): string => `[data-mol-id="file-context-${action}"]`

/** A workspace with a nested directory, so depth defaults and ancestors show. */
const TREE: FileNode[] = [
  {
    name: 'src',
    path: '/workspace/src',
    type: 'directory',
    children: [
      {
        name: 'lib',
        path: '/workspace/src/lib',
        type: 'directory',
        children: [{ name: 'util.ts', path: '/workspace/src/lib/util.ts', type: 'file' }],
      },
      { name: 'main.ts', path: '/workspace/src/main.ts', type: 'file' },
    ],
  },
  { name: 'README.md', path: '/workspace/README.md', type: 'file' },
  { name: 'package.json', path: '/workspace/package.json', type: 'file' },
]

/** Three root files, for the selection and keyboard cases. */
const FLAT: FileNode[] = [
  { name: 'c.ts', path: '/workspace/c.ts', type: 'file' },
  { name: 'a.ts', path: '/workspace/a.ts', type: 'file' },
  { name: 'b.ts', path: '/workspace/b.ts', type: 'file' },
]

/** A status per shape, a symlinked file, a symlinked directory and a dimmed one. */
const DETAIL: FileNode[] = [
  {
    name: 'app',
    path: '/workspace/app',
    type: 'directory',
    children: [
      { name: 'a.ts', path: '/workspace/app/a.ts', type: 'file' },
      { name: 'b.ts', path: '/workspace/app/b.ts', type: 'file' },
      { name: 'gone.ts', path: '/workspace/app/gone.ts', type: 'file' },
    ],
  },
  { name: 'docs', path: '/workspace/docs', type: 'directory', symlinkTarget: '/workspace/app' },
  {
    name: 'legacy',
    path: '/workspace/legacy',
    type: 'directory',
    isDimmed: true,
    children: [{ name: 'old.ts', path: '/workspace/legacy/old.ts', type: 'file' }],
  },
  { name: 'link.ts', path: '/workspace/link.ts', type: 'file', symlinkTarget: '../shared/link.ts' },
]

/** The git statuses of {@link DETAIL}: a modified, an untracked and a deleted file. */
const STATUSES: Record<string, string> = {
  '/workspace/app/a.ts': 'modified',
  '/workspace/app/b.ts': 'untracked',
  '/workspace/app/gone.ts': 'deleted',
}

/** `FileExplorer`. */
export const fileExplorerCases: FeatureComponentCases = {
  component: 'FileExplorer',
  cases: [
    // ── Structure ───────────────────────────────────────────────────────────
    {
      name: 'an empty tree',
      props: { files: [] },
      callbacks: ['onFileSelect'],
    },
    {
      name: 'an empty tree follows a locale switch',
      props: { files: [] },
      callbacks: ['onFileSelect'],
      context: {
        translations: { fr: { ide: { files: { empty: 'Aucun fichier' } } } },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
    {
      name: 'directories come first, each group alphabetical',
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onDirExpand'],
    },
    {
      name: 'className is passed through and follows a change',
      props: { files: TREE, className: 'parity-root' },
      callbacks: ['onFileSelect'],
      interactions: [{ type: 'props', props: { className: 'parity-other' } }],
    },

    // ── Expand state and loading ────────────────────────────────────────────
    {
      name: 'clicking a directory collapses and expands it',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/src') },
        { type: 'click', selector: row('/workspace/src') },
      ],
    },
    {
      name: 'a directory without children asks for them when it opens',
      props: {
        files: [
          { name: 'src', path: '/workspace/src', type: 'directory' },
          { name: 'README.md', path: '/workspace/README.md', type: 'file' },
        ],
      },
      callbacks: ['onFileSelect', 'onDirExpand'],
      interactions: [
        { type: 'click', selector: row('/workspace/src') },
        { type: 'click', selector: row('/workspace/src') },
      ],
    },
    {
      name: 'a persisted tree mounts and a toggle is saved under its key',
      props: { files: TREE, persistKey: 'ide.tree.a' },
      callbacks: ['onFileSelect'],
      interactions: [{ type: 'click', selector: row('/workspace/src') }],
    },
    {
      name: 'a later persistKey prop follows the new key',
      props: { files: TREE, persistKey: 'ide.tree.b' },
      callbacks: ['onFileSelect'],
      interactions: [{ type: 'props', props: { persistKey: 'ide.other' } }],
    },

    // ── The active file ─────────────────────────────────────────────────────
    {
      name: 'the active file opens its ancestors and is highlighted',
      props: { files: TREE, activeFile: '/workspace/src/lib/util.ts' },
      callbacks: ['onFileSelect'],
    },
    {
      name: 'a later activeFile opens another branch',
      props: { files: TREE, activeFile: null },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'props', props: { activeFile: '/workspace/src/lib/util.ts' } },
        { type: 'props', props: { activeFile: '/workspace/README.md' } },
      ],
    },

    // ── Git statuses, symlinks, dimmed rows ─────────────────────────────────
    {
      name: 'git statuses color files and roll up to their directory',
      props: { files: DETAIL, fileStatuses: STATUSES },
      callbacks: ['onFileSelect'],
    },
    {
      name: 'the light theme colors the same statuses its own way',
      props: { files: DETAIL, fileStatuses: STATUSES },
      callbacks: ['onFileSelect'],
      context: { theme: 'light' },
    },
    {
      name: 'a symlinked file opens its resolved target',
      props: { files: DETAIL },
      callbacks: ['onFileSelect'],
      interactions: [{ type: 'click', selector: row('/workspace/link.ts') }],
    },
    {
      name: 'a symlinked directory reveals its target and highlights it',
      props: { files: DETAIL },
      callbacks: ['onFileSelect'],
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: row('/workspace/docs') },
        { type: 'advance', ms: 20 },
      ],
    },

    // ── Selection ───────────────────────────────────────────────────────────
    {
      name: 'clicking a file selects and opens it',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [{ type: 'click', selector: row('/workspace/b.ts') }],
    },
    {
      name: 'ctrl-click toggles rows without opening them',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'click', selector: row('/workspace/b.ts'), modifiers: { ctrlKey: true } },
        { type: 'click', selector: row('/workspace/b.ts'), modifiers: { ctrlKey: true } },
      ],
    },
    {
      name: 'shift-click selects the range to the anchor',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'click', selector: row('/workspace/c.ts'), modifiers: { shiftKey: true } },
      ],
    },
    {
      name: 'shift with ctrl adds the range to the selection',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'click', selector: row('/workspace/c.ts'), modifiers: { ctrlKey: true } },
        {
          type: 'click',
          selector: row('/workspace/b.ts'),
          modifiers: { ctrlKey: true, shiftKey: true },
        },
      ],
    },
    {
      name: 'space toggles the focused row and Escape clears everything',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: ' ' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: ' ' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'Escape' },
      ],
    },
    {
      name: 'ctrl-a selects every visible row',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'a', ctrlKey: true },
      ],
    },

    // ── Keyboard navigation ─────────────────────────────────────────────────
    {
      name: 'arrow keys move the focus and the selection, shift extends it',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowUp' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown', shiftKey: true },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowUp', shiftKey: true },
      ],
    },
    {
      name: 'ctrl-arrow moves the focus without touching the selection',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown', ctrlKey: true },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown', ctrlKey: true },
      ],
    },
    {
      name: 'arrow right opens a directory, then steps into it',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/src') },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowRight' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowRight' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowRight' },
      ],
    },
    {
      name: 'arrow left closes a directory, then moves to its parent',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/src') },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowRight' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowRight' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowLeft' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'ArrowLeft' },
      ],
    },
    {
      name: 'enter opens a file and toggles a directory',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/README.md') },
        { type: 'keydown', selector: row('/workspace/README.md'), key: 'Enter' },
        { type: 'click', selector: row('/workspace/src') },
        { type: 'keydown', selector: row('/workspace/src'), key: 'Enter' },
        { type: 'keydown', selector: row('/workspace/src'), key: 'Enter' },
      ],
    },
    {
      name: 'delete removes the one selected row, or every selected row',
      props: { files: FLAT },
      callbacks: ['onFileSelect', 'onDelete', 'onDeleteMultiple'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'Delete' },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'a', ctrlKey: true },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'Backspace' },
      ],
    },
    {
      name: 'F2 renames the one selected row',
      props: { files: FLAT },
      callbacks: ['onFileSelect', 'onRename'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'F2' },
      ],
    },
    {
      name: 'double-clicking a file opens it; a directory ignores it',
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onFileDoubleClick'],
      interactions: [
        { type: 'dblclick', selector: row('/workspace/README.md') },
        { type: 'dblclick', selector: row('/workspace/src') },
      ],
    },

    // ── The context menu ────────────────────────────────────────────────────
    {
      name: 'a right-click on a file opens its menu and Open hands it over',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        {
          type: 'event',
          selector: row('/workspace/README.md'),
          event: 'contextmenu',
          bubbles: true,
        },
        { type: 'click', selector: entry('open') },
      ],
    },
    {
      name: "the file menu's actions hand over that node",
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onRename', 'onDelete'],
      interactions: [
        {
          type: 'event',
          selector: row('/workspace/README.md'),
          event: 'contextmenu',
          bubbles: true,
        },
        { type: 'click', selector: entry('rename') },
        {
          type: 'event',
          selector: row('/workspace/README.md'),
          event: 'contextmenu',
          bubbles: true,
        },
        { type: 'click', selector: entry('delete') },
      ],
    },
    {
      name: 'a directory menu creates inside it and deletes it',
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onDelete', 'onNewFile', 'onNewFolder'],
      interactions: [
        { type: 'event', selector: row('/workspace/src'), event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('newFile') },
        { type: 'event', selector: row('/workspace/src'), event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('newFolder') },
        { type: 'event', selector: row('/workspace/src'), event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('delete') },
      ],
    },
    {
      name: 'a right-click on an unselected row selects it; a selected one keeps the selection',
      props: { files: FLAT },
      callbacks: ['onFileSelect', 'onDeleteMultiple'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        { type: 'click', selector: row('/workspace/b.ts'), modifiers: { ctrlKey: true } },
        { type: 'event', selector: row('/workspace/b.ts'), event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('deleteMultiple') },
        { type: 'event', selector: row('/workspace/c.ts'), event: 'contextmenu', bubbles: true },
      ],
    },
    {
      name: 'the background menu creates at the root and collapses everything',
      props: { files: TREE, className: 'parity-root' },
      callbacks: ['onFileSelect', 'onNewFile', 'onCollapseAll'],
      interactions: [
        { type: 'event', selector: '.parity-root', event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('newFile') },
        { type: 'event', selector: '.parity-root', event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('collapseAll') },
      ],
    },
    {
      name: 'read-only omits every mutating entry and keeps collapse-all',
      props: { files: TREE, readOnly: true },
      callbacks: ['onFileSelect', 'onCollapseAll'],
      interactions: [
        { type: 'event', selector: row('/workspace/src'), event: 'contextmenu', bubbles: true },
        { type: 'click', selector: entry('collapseAll') },
      ],
    },

    // ── Drag and drop ───────────────────────────────────────────────────────
    {
      name: 'dragging a file onto a directory moves it in',
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onMoveFiles'],
      fakeTimers: true,
      interactions: [
        {
          type: 'transfer',
          selector: row('/workspace/README.md'),
          event: 'dragstart',
          data: { 'text/plain': '/workspace/README.md' },
        },
        { type: 'advance', ms: 20 },
        { type: 'transfer', selector: row('/workspace/src'), event: 'dragover' },
        { type: 'transfer', selector: row('/workspace/src'), event: 'drop' },
      ],
    },
    {
      name: 'a drag onto itself is refused, and leaving a row clears the target',
      props: { files: TREE },
      callbacks: ['onFileSelect', 'onMoveFiles'],
      fakeTimers: true,
      interactions: [
        {
          type: 'transfer',
          selector: row('/workspace/src'),
          event: 'dragstart',
          data: { 'text/plain': '/workspace/src' },
        },
        { type: 'advance', ms: 20 },
        { type: 'transfer', selector: row('/workspace/src'), event: 'dragover' },
        { type: 'transfer', selector: row('/workspace/README.md'), event: 'dragleave' },
        { type: 'transfer', selector: row('/workspace/src'), event: 'dragend' },
      ],
    },
    {
      name: 'a drop on the empty area moves to the workspace root',
      props: { files: TREE, className: 'parity-root' },
      callbacks: ['onFileSelect', 'onMoveFiles'],
      fakeTimers: true,
      interactions: [
        {
          type: 'transfer',
          selector: row('/workspace/src/main.ts'),
          event: 'dragstart',
          data: { 'text/plain': '/workspace/src/main.ts' },
        },
        { type: 'advance', ms: 20 },
        { type: 'transfer', selector: '.parity-root', event: 'dragover' },
        { type: 'transfer', selector: '.parity-root', event: 'drop' },
      ],
    },
    {
      name: 'dragging an unselected row selects it alone',
      props: { files: FLAT },
      callbacks: ['onFileSelect', 'onMoveFiles'],
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        {
          type: 'transfer',
          selector: row('/workspace/c.ts'),
          event: 'dragstart',
          data: { 'text/plain': '/workspace/c.ts' },
        },
        { type: 'advance', ms: 20 },
      ],
    },

    // ── Touch ───────────────────────────────────────────────────────────────
    {
      name: 'a coarse pointer makes rows touch-sized and undraggable',
      props: { files: FLAT, className: 'parity-root' },
      callbacks: ['onFileSelect'],
      pointer: 'coarse',
    },
    {
      name: 'a long-press opens the row menu; a later click still selects',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      pointer: 'coarse',
      fakeTimers: true,
      interactions: [
        { type: 'event', selector: row('/workspace/a.ts'), event: 'pointerdown', bubbles: true },
        { type: 'advance', ms: 600 },
        { type: 'click', selector: row('/workspace/a.ts') },
      ],
    },
    {
      name: 'a long-press on the empty area opens the background menu',
      props: { files: FLAT, className: 'parity-root' },
      callbacks: ['onFileSelect', 'onNewFile'],
      pointer: 'coarse',
      fakeTimers: true,
      interactions: [
        { type: 'event', selector: '.parity-root', event: 'pointerdown', bubbles: true },
        { type: 'advance', ms: 600 },
        { type: 'click', selector: entry('newFile') },
      ],
    },

    // ── Props ───────────────────────────────────────────────────────────────
    {
      name: 'a smaller tree prunes the selections it no longer shows',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/b.ts') },
        {
          type: 'props',
          props: { files: [FLAT[1], FLAT[0]] },
        },
      ],
    },
    {
      name: 'a props update keeps the tree and the focus it had',
      props: { files: FLAT },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/a.ts') },
        {
          type: 'props',
          props: { files: [...FLAT, { name: 'd.ts', path: '/workspace/d.ts', type: 'file' }] },
        },
        { type: 'keydown', selector: row('/workspace/a.ts'), key: 'ArrowDown' },
      ],
    },
    {
      name: 'no callbacks wired: clicks and keys stay in the tree',
      props: { files: TREE },
      callbacks: ['onFileSelect'],
      interactions: [
        { type: 'click', selector: row('/workspace/src') },
        { type: 'click', selector: row('/workspace/src') },
        { type: 'click', selector: row('/workspace/README.md') },
        { type: 'keydown', selector: row('/workspace/README.md'), key: 'Delete' },
        { type: 'keydown', selector: row('/workspace/README.md'), key: 'F2' },
        { type: 'keydown', selector: row('/workspace/README.md'), key: 'Enter' },
      ],
    },
  ],
}
