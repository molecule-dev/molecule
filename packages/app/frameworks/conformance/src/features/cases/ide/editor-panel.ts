/**
 * `EditorPanel` cases.
 *
 * The editor panel reads its tab list from the bonded code-editor service, so
 * every case seeds `context.areas.native.editor` (the recording fake) and drives
 * the rest of the panel through props, `control` steps on that fake and the
 * viewport/theme context. The cases cover: the defaults (no files, no props),
 * tabs with git statuses and diagnostics colors, a preview and a diff tab, the
 * formatting toast (its enter animation, its estimate-driven progress bar, its
 * exit timer, and the no-open-file / non-active-file states), the save-debounce
 * countdown line and its restart key, read-only at mount and switched on, both
 * theme modes, a phone-width viewport (the mobile editor options), the tab bar's
 * callbacks (select, close, double-click with and without a host override), the
 * Fix-with-AI subscription and a tab opened from outside the panel.
 *
 * The toast's animation state only moves on a `requestAnimationFrame` tick, so
 * every case that shows it fakes timers and advances the clock: the snapshot
 * straight after mount shows the pre-animation state and the next one the
 * animated state on every framework, instead of depending on when a real frame
 * happens to fire.
 *
 * @module
 */

import type { EditorTab } from '@molecule/app-code-editor'
import type { Translations } from '@molecule/app-i18n'

import type { FeatureCaseContext, FeatureComponentCases } from '../../spec.js'

/**
 * The IDE's own user-visible strings, as `@molecule/app-locales-ide` supplies
 * them (nested by the dotted key's segments). The cases carry them so the
 * recorded calls show the panel's behavior rather than the i18n provider's
 * missing-key logging, which fires on every render of a translated label that
 * has no default of its own (the tab bar's close label); the pseudo-locale
 * switch still re-renders the text.
 */
const IDE_STRINGS: Translations = {
  ide: {
    formatting: 'Formatting…',
    tabs: { close: 'Close {fileName}' },
  },
}

/**
 * Two open files, the first active, the second dirty and git-modified.
 *
 * @returns Fresh tab records (a case may never share mutated state).
 */
const twoTabs = (): EditorTab[] => [
  { path: 'src/app.ts', label: 'app.ts', isDirty: false, isActive: true },
  { path: 'src/util.ts', label: 'util.ts', isDirty: true, isActive: false },
]

/**
 * Three open files: an active source file carrying diagnostics, a preview tab
 * and a diff tab.
 *
 * @returns Fresh tab records.
 */
const mixedTabs = (): EditorTab[] => [
  {
    path: 'src/app.ts',
    label: 'app.ts',
    isDirty: false,
    isActive: true,
    diagnostics: { errors: 2, warnings: 1 },
  },
  { path: 'src/draft.ts', label: 'draft.ts', isDirty: false, isActive: false, isPreview: true },
  { path: 'src/old.ts', label: 'old.ts (diff)', isDirty: false, isActive: false, isDiff: true },
]

/**
 * A case context with the recording code-editor service and the given tabs.
 *
 * @param tabs - The tabs open at mount (default: none).
 * @param extra - Further case-context fields (theme, locale, …).
 * @returns The case context.
 */
const editorContext = (
  tabs: EditorTab[] = [],
  extra: FeatureCaseContext = {},
): FeatureCaseContext => ({
  ...extra,
  translations: { en: IDE_STRINGS, ...extra.translations },
  areas: { ...extra.areas, native: { ...extra.areas?.native, editor: { tabs } } },
})

/** `EditorPanel`. */
export const editorPanelCases: FeatureComponentCases = {
  component: 'EditorPanel',
  cases: [
    {
      name: 'two open files while one formats',
      props: {
        formattingFile: 'src/app.ts',
        countdownFile: 'src/app.ts',
        countdownKey: 1,
        fileStatuses: { 'src/util.ts': 'modified' },
      },
      callbacks: ['onActiveFileChange', 'onTabsChange', 'onEditorReady', 'onFixWithAI'],
      context: editorContext(twoTabs()),
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 32 }],
    },
    {
      name: 'no open file',
      props: {},
      context: editorContext(),
    },
    {
      name: 'no open file with every callback',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange', 'onEditorReady'],
      context: editorContext(),
    },
    {
      name: 'a className joins the root',
      props: { className: 'parity-editor' },
      context: editorContext(twoTabs()),
    },
    {
      name: 'the class and status props change',
      props: { className: 'parity-editor', fileStatuses: { 'src/util.ts': 'modified' } },
      context: editorContext(mixedTabs()),
      interactions: [
        {
          type: 'props',
          props: {
            className: 'parity-editor parity-next',
            fileStatuses: { 'src/app.ts': 'deleted', 'src/draft.ts': 'untracked' },
          },
        },
      ],
    },
    {
      name: 'read-only at mount',
      props: { readOnly: true },
      context: editorContext(twoTabs()),
    },
    {
      name: 'read-only switches on',
      props: {},
      context: editorContext(twoTabs()),
      interactions: [{ type: 'props', props: { readOnly: true } }],
    },
    {
      name: 'a light theme',
      props: {},
      context: editorContext(twoTabs(), { theme: 'light' }),
    },
    {
      name: 'a dark theme',
      props: {},
      context: editorContext(twoTabs(), { theme: 'dark' }),
    },
    {
      name: 'a phone-width viewport tunes the editor',
      props: {},
      context: editorContext(twoTabs()),
      viewportWidth: 390,
    },
    {
      name: 'a touch-first device has taller tabs',
      props: {},
      context: editorContext(twoTabs()),
      pointer: 'coarse',
    },
    {
      name: 'the format estimate drives the progress bar',
      props: { formattingFile: 'src/app.ts', formatEstimate: 500 },
      context: editorContext(twoTabs()),
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 32 }],
    },
    {
      name: 'formatting starts after mount',
      props: {},
      context: editorContext(twoTabs()),
      fakeTimers: true,
      interactions: [
        { type: 'props', props: { formattingFile: 'src/app.ts', formatEstimate: 1200 } },
        { type: 'advance', ms: 32 },
      ],
    },
    {
      name: 'formatting stops and the toast slides out',
      props: { formattingFile: 'src/util.ts' },
      context: editorContext(twoTabs()),
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 32 },
        { type: 'props', props: { formattingFile: null } },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'formatting without an open file shows no toast',
      props: { formattingFile: 'src/app.ts' },
      context: editorContext(),
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 32 }],
    },
    {
      name: 'the countdown line restarts on a new key',
      props: { countdownFile: 'src/app.ts', countdownKey: 1 },
      context: editorContext(twoTabs()),
      interactions: [{ type: 'props', props: { countdownKey: 2 } }],
    },
    {
      name: 'no countdown line for another file',
      props: { countdownFile: 'src/util.ts', countdownKey: 3 },
      context: editorContext(twoTabs()),
    },
    {
      name: 'selecting the second tab',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange'],
      context: editorContext(twoTabs()),
      interactions: [{ type: 'click', selector: '[title="src/util.ts"]' }],
    },
    {
      name: 'closing the active tab',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange'],
      context: editorContext(twoTabs()),
      interactions: [{ type: 'click', selector: 'button[data-mol-id="tab-close"]' }],
    },
    {
      name: 'no active tab',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange'],
      context: editorContext([
        { path: 'src/app.ts', label: 'app.ts', isDirty: false, isActive: false },
        { path: 'src/util.ts', label: 'util.ts', isDirty: false, isActive: false },
      ]),
    },
    {
      name: 'double-clicking a preview tab pins it',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange'],
      context: editorContext(mixedTabs()),
      interactions: [{ type: 'dblclick', selector: '[title="src/draft.ts"]' }],
    },
    {
      name: 'a host that handles double-click skips the pin',
      props: {},
      callbacks: ['onTabDoubleClick', 'onTabsChange'],
      callbackResults: { onTabDoubleClick: { returns: true } },
      context: editorContext(mixedTabs()),
      interactions: [{ type: 'dblclick', selector: '[title="src/draft.ts"]' }],
    },
    {
      name: 'a host that declines double-click pins',
      props: {},
      callbacks: ['onTabDoubleClick', 'onTabsChange'],
      callbackResults: { onTabDoubleClick: { returns: false } },
      context: editorContext(mixedTabs()),
      interactions: [{ type: 'dblclick', selector: '[title="src/draft.ts"]' }],
    },
    {
      name: 'Fix with AI reaches the host',
      props: {},
      callbacks: ['onFixWithAI'],
      context: editorContext(twoTabs()),
      interactions: [
        { type: 'control', name: 'native.editor.fixWithAI', args: ['src/app.ts', 12] },
      ],
    },
    {
      name: 'a file opened outside the panel',
      props: {},
      callbacks: ['onActiveFileChange', 'onTabsChange'],
      context: editorContext(twoTabs()),
      interactions: [
        {
          type: 'control',
          name: 'native.editor.openFromOutside',
          args: ['src/outside.ts', 'outside content'],
        },
      ],
    },
  ],
}
