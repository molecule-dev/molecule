/**
 * `CommandPalette` cases: the ⌘⇧P overlay's every behavior — the rows derived
 * from the commands (the `category: label` prefix, the shortcut as the detail
 * beside the label, a bare label without either), the placeholder in its own
 * translation, the fuzzy filter as the user types, every way a command runs
 * (Enter on the highlight, Enter after typing, a click, a hover then Enter)
 * each followed by the dismissal, the dismissal paths that run nothing
 * (Escape, the backdrop), and a replaced `commands` prop re-deriving the rows
 * and rebinding the handlers.
 *
 * The palette is a thin overlay over the package's own `QuickPicker` — the
 * rows, the filter and the keyboard live there (its cases cover them) — so
 * these cases pin what the palette itself adds: the derived items, the
 * placeholder (`ide.commandPalette.placeholder`) and the execute dispatch.
 * Each command carries its own recording spy, so the calls tell WHICH command
 * ran, not just that one did.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The commands most cases share: category + shortcut, bare, shortcut only. */
const COMMANDS = [
  {
    id: 'terminal',
    label: 'Toggle Terminal',
    category: 'View',
    shortcut: 'Ctrl+`',
    execute: { $callback: 'runTerminal' },
  },
  { id: 'new-file', label: 'New File', execute: { $callback: 'runNewFile' } },
  {
    id: 'settings',
    label: 'Open Settings',
    shortcut: 'Cmd+,',
    execute: { $callback: 'runSettings' },
  },
]

/** `CommandPalette`. */
export const commandPaletteCases: FeatureComponentCases = {
  component: 'CommandPalette',
  keyedLists: [
    {
      prop: 'commands',
      selector: '[data-mol-id^="quick-picker-item-"]',
      caseName: 'commands with a category prefix, a shortcut detail and a bare label',
    },
  ],
  cases: [
    // ── The empty palette ───────────────────────────────────────────────────
    { name: 'no commands', props: { commands: [] }, callbacks: ['onDismiss'] },
    {
      name: 'commands with a category prefix, a shortcut detail and a bare label',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
    },
    {
      name: 'commands without categories or shortcuts show bare labels',
      props: {
        commands: [{ id: 'about', label: 'About', execute: { $callback: 'runAbout' } }],
      },
      callbacks: ['onDismiss'],
    },

    // ── Running a command ───────────────────────────────────────────────────
    {
      name: 'Enter on the first row runs it and dismisses',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'keydown', selector: 'input[type="text"]', key: 'Enter' }],
    },
    {
      name: 'Enter after the arrows runs the highlighted command and dismisses',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },
    {
      name: 'clicking a command runs it and dismisses',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'click', selector: '[data-mol-id="quick-picker-item-settings"]' }],
    },
    {
      name: 'hovering a command highlights it and Enter runs it',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="quick-picker-item-new-file"]' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },

    // ── The query ───────────────────────────────────────────────────────────
    {
      name: 'typing filters the commands by fuzzy match',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'input', selector: 'input[type="text"]', value: 'new' }],
    },
    {
      name: 'Enter after typing runs the top match and dismisses',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'input', selector: 'input[type="text"]', value: 'settings' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },
    {
      name: 'a query that matches nothing says so',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'input', selector: 'input[type="text"]', value: 'zzzz' }],
    },

    // ── Dismissing without running anything ─────────────────────────────────
    {
      name: 'Escape dismisses without running anything',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'keydown', selector: 'input[type="text"]', key: 'Escape' }],
    },
    {
      name: 'the backdrop dismisses without running anything',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'click', selector: 'div[role="presentation"]:has(> [role="dialog"])' },
      ],
    },

    // ── New commands ────────────────────────────────────────────────────────
    {
      name: 'replaced commands re-derive the rows and rebind the handlers',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        {
          type: 'props',
          props: {
            commands: [
              {
                id: 'deploy',
                label: 'Deploy Site',
                category: 'Workspace',
                execute: { $callback: 'runDeploy' },
              },
              { id: 'reload', label: 'Reload Window', execute: { $callback: 'runReload' } },
            ],
          },
        },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-translates the placeholder',
      props: { commands: COMMANDS },
      callbacks: ['onDismiss'],
      context: {
        locale: 'en',
        translations: {
          en: { ide: { commandPalette: { placeholder: 'Type a command…' } } },
          fr: { ide: { commandPalette: { placeholder: 'Tapez une commande…' } } },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
