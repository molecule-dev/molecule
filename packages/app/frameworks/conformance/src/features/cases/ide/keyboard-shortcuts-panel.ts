/**
 * `KeyboardShortcutsPanel` cases: the shortcuts reference overlay's every
 * branch — the grouped rows with their key-badge splits and category headers,
 * the arrow, Enter and Escape navigation over the flat index (with its
 * clamps, and the empty-list index that falls to -1), the pointer path (row
 * clicks and hovers, the backdrop and the close button, the close button's
 * hover style), the selection surviving a replaced list, the dark theme's
 * tints and the locale switch.
 *
 * The key listener sits on `document` in the capture phase, so the key steps
 * dispatch on a row and bubble up to it. The listener's removal on unmount
 * has no case: the step runner allows no keydown step after an unmount.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The click-away backdrop, the overlay's first element. */
const BACKDROP = 'div[role="presentation"]:has(> [role="dialog"])'
/** The header's ✕ dismiss. */
const CLOSE = '[data-mol-id="shortcuts-close"]'
/** A shortcut row by its flat index. */
const row = (i: number): string => `[data-mol-id="shortcut-row-${String(i)}"]`

/** The shortcuts most cases share: two categories, one handler-less row, one multi-part chord. */
const SHORTCUTS = [
  { label: 'Save file', keys: '⌘S', category: 'File', execute: { $callback: 'executeSaveFile' } },
  { label: 'Open file', keys: '⌘O', category: 'File', execute: { $callback: 'executeOpenFile' } },
  { label: 'Toggle sidebar', keys: '⌘B', category: 'View' },
  { label: 'Find in files', keys: '⌘ ⇧ F', execute: { $callback: 'executeFindInFiles' } },
  { label: 'Toggle timestamps', keys: '⌘ K ⌘ T' },
]

/** `KeyboardShortcutsPanel`. */
export const keyboardShortcutsPanelCases: FeatureComponentCases = {
  component: 'KeyboardShortcutsPanel',
  keyedLists: [
    {
      prop: 'shortcuts',
      selector: '[data-shortcut-row]',
      caseName: 'rows grouped by category with key badges',
    },
  ],
  cases: [
    // ── The empty overlay ───────────────────────────────────────────────────
    {
      name: 'no shortcuts',
      props: { shortcuts: [] },
      callbacks: ['onDismiss'],
    },

    // ── The rows ────────────────────────────────────────────────────────────
    {
      name: 'rows grouped by category with key badges',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
    },
    {
      name: 'a category seen again appends to its first group',
      props: {
        shortcuts: [
          { label: 'Zoom in', keys: '⌘=', category: 'View' },
          { label: 'New file', keys: '⌘N', category: 'File' },
          { label: 'Zoom out', keys: '⌘-', category: 'View' },
          { label: 'Save all', keys: '⌘⌥S', category: 'File' },
        ],
      },
      callbacks: ['onDismiss'],
    },

    // ── Keyboard navigation ─────────────────────────────────────────────────
    {
      name: 'arrow keys move the selection and clamp at both ends',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
      ],
    },
    {
      name: 'Escape dismisses; the panel keeps listening while mounted',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: row(0), key: 'Escape' },
        { type: 'keydown', selector: row(0), key: 'Escape' },
      ],
    },
    {
      name: 'Enter runs the selected row and dismisses',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'Enter' },
      ],
    },
    {
      name: 'Enter on a row without a handler does nothing',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'Enter' },
      ],
    },
    {
      name: 'Enter with no rows does nothing',
      props: { shortcuts: [] },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: CLOSE, key: 'ArrowDown' },
        { type: 'keydown', selector: CLOSE, key: 'ArrowUp' },
        { type: 'keydown', selector: CLOSE, key: 'Enter' },
        { type: 'keydown', selector: CLOSE, key: 'Escape' },
      ],
    },
    {
      name: 'an unbound key is ignored',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'keydown', selector: row(0), key: 'a' }],
    },

    // ── The pointer ─────────────────────────────────────────────────────────
    {
      name: 'clicking a row runs it and dismisses',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: row(0) }],
    },
    {
      name: 'clicking a row without a handler does nothing',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: row(2) }],
    },
    {
      name: 'hovering a row moves the tint and Enter runs the hovered row',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: row(3) },
        { type: 'keydown', selector: row(0), key: 'Enter' },
        { type: 'mouseenter', selector: row(4) },
        { type: 'keydown', selector: row(0), key: 'Enter' },
      ],
    },
    {
      name: 'hovering the close button highlights it until the pointer leaves',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: CLOSE },
        { type: 'mouseleave', selector: CLOSE },
      ],
    },
    {
      name: 'clicking the backdrop dismisses the panel',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: BACKDROP }],
    },
    {
      name: 'clicking the close button dismisses the panel',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: CLOSE }],
    },

    // ── Replaced shortcuts ──────────────────────────────────────────────────
    {
      name: 'replaced shortcuts keep the selection index',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        { type: 'keydown', selector: row(0), key: 'ArrowDown' },
        {
          type: 'props',
          props: {
            shortcuts: [
              {
                label: 'Copy path',
                keys: '⌘⇧C',
                category: 'File',
                execute: { $callback: 'executeCopyPath' },
              },
              {
                label: 'Toggle terminal',
                keys: '⌘`',
                category: 'View',
                execute: { $callback: 'executeToggleTerminal' },
              },
            ],
          },
        },
        { type: 'keydown', selector: row(0), key: 'ArrowUp' },
        { type: 'keydown', selector: row(0), key: 'Enter' },
      ],
    },

    // ── Theme and locale ────────────────────────────────────────────────────
    {
      name: 'the dark theme tints the panel, the badges and the selection',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      context: { theme: 'dark' },
      interactions: [{ type: 'keydown', selector: row(0), key: 'ArrowDown' }],
    },
    {
      name: 'a locale switch re-renders the title, close label and hint',
      props: { shortcuts: SHORTCUTS },
      callbacks: ['onDismiss'],
      context: {
        locale: 'en',
        translations: {
          en: {
            ide: {
              shortcuts: {
                title: 'Keyboard Shortcuts',
                close: 'Close',
                hint: 'Arrow keys to navigate · Enter to run · Esc to close',
              },
            },
          },
          fr: {
            ide: {
              shortcuts: {
                title: 'Raccourcis clavier',
                close: 'Fermer',
                hint: 'Flèches pour naviguer · Entrée pour lancer · Échap pour fermer',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
