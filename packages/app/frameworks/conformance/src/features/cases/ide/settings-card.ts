/**
 * Cases for the IDE's `SettingsCard`, a component `@molecule/app-ide-react` renders but does
 * not export (a part, listed in `ide.ts`). Its port fills them in.
 *
 * The card is PRESENTATIONAL: the settings list arrives as props (built from the shared
 * `SETTINGS` metadata via `buildSettingsList`), the slash-command reference is derived from the
 * shared `COMMANDS` registry inside the component, and every edit is a click on an inline
 * affordance. The cases hold every prop and branch: the full list in both themes, the embedded
 * overlay layout, an empty list, a custom and the default agent name, the mode-scoped prefill
 * path versus the bare command path, the prefill handler's absence, the styled Tooltip that
 * reveals each edit's command, prop changes, and a locale switch.
 *
 * @module
 */

import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/**
 * Display-ready values for every canonical setting — the full list every complete case renders,
 * covering command-less rows (`hooks`), scoped edits (`planModel`/`executeModel`) and bare
 * command edits (`effort`).
 */
const SAMPLE_VALUES: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  commitModel: 'Fast default',
  compactModel: 'Fast default',
  mode: 'Execute',
  effort: 'Maximum (XL)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: '3 of 9 events enabled',
  timestamps: 'Off',
}

/** The full settings list, the same one the React unit tests build. */
const SETTINGS = buildSettingsList(SAMPLE_VALUES)

/** A short two-row list — one editable row and the command-less Hooks row. */
const SUBSET = SETTINGS.filter((setting) => setting.id === 'model' || setting.id === 'hooks')

/** The edit button for a setting id, as the card writes it. */
const edit = (id: string): string => `[data-mol-id="setting-edit-${id}"]`

/** Every full-card case shares the two callbacks. */
const CALLBACKS = ['onRunCommand', 'onPrefillInput']

/** `SettingsCard`'s cases. */
export const settingsCardCases: FeatureComponentCases = {
  component: 'SettingsCard',
  cases: [
    // ── The full card ───────────────────────────────────────────────────────
    {
      name: 'the full settings card in the light theme',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
    },
    {
      name: 'the full settings card in the dark theme',
      props: { settings: SETTINGS, isLight: false },
      callbacks: CALLBACKS,
    },
    {
      name: 'a custom agent name is interpolated into the descriptions',
      props: { settings: SETTINGS, isLight: true, agentName: 'Fable' },
      callbacks: CALLBACKS,
    },

    // ── The embedded overlay layout ─────────────────────────────────────────
    {
      name: 'embedded in the overlay it drops its heading and card chrome',
      props: { settings: SETTINGS, isLight: true, embedded: true },
      callbacks: CALLBACKS,
    },

    // ── Empty and short lists ───────────────────────────────────────────────
    {
      name: 'an empty settings list still lists every command',
      props: { settings: [], isLight: true },
      callbacks: CALLBACKS,
    },
    {
      name: 'a short list renders only its rows',
      props: { settings: SUBSET, isLight: true },
      callbacks: CALLBACKS,
    },

    // ── The edit affordances' two paths ─────────────────────────────────────
    {
      name: 'a mode-scoped edit prefills its command input',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: edit('planModel') }],
    },
    {
      name: 'a bare edit runs its slash command',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'click', selector: edit('effort') },
        { type: 'click', selector: edit('autoCommit') },
      ],
    },
    {
      name: 'without a prefill handler a scoped edit runs the bare command',
      props: { settings: SETTINGS, isLight: true },
      callbacks: ['onRunCommand'],
      interactions: [
        { type: 'click', selector: edit('planModel') },
        { type: 'click', selector: edit('executeModel') },
      ],
    },

    // ── The styled Tooltip that reveals each command ────────────────────────
    {
      name: 'hovering a scoped edit reveals its exact command',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'mouseenter', selector: edit('planModel') },
        { type: 'mouseleave', selector: edit('planModel') },
      ],
    },
    {
      name: 'hovering a bare edit reveals its slash command',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'mouseenter', selector: edit('effort') }],
    },

    // ── Prop changes ────────────────────────────────────────────────────────
    {
      name: 'a new settings list re-renders the rows',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'props', props: { settings: SUBSET } }],
    },
    {
      name: 'toggling the theme recolors the rows in place',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'props', props: { isLight: false } }],
    },
    {
      name: 'switching to the embedded layout drops the heading',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'props', props: { embedded: true } }],
    },
    {
      name: 'a new agent name re-interpolates the descriptions',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      interactions: [{ type: 'props', props: { agentName: 'Fable' } }],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the card, rows and commands',
      props: { settings: SETTINGS, isLight: true },
      callbacks: CALLBACKS,
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                settings: {
                  heading: 'Paramètres',
                  edit: 'Modifier',
                  commandsHeading: 'Commandes slash',
                  model: { label: 'Modèle par défaut' },
                },
                help: { category: { model: 'Modèle' } },
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
