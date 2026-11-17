/**
 * `TabBar` cases: the editor's tab strip — its active-tab highlight following
 * `activeFile`, the `className` pass-through, a dirty tab's bullet, the italic
 * preview tab, the git-status and diagnostic filename colors and their
 * precedence (errors, then a deleted file, then warnings, then the status),
 * the dark-theme color tables, a diff tab's suppressed diagnostics and its
 * delayed single click (cancelled by a double click), the keyboard selection
 * and the Delete key that closes the focused tab, the close control (and its
 * click isolation), the hover-gated close reveal, the focus reveal (a focused
 * tab shows its close button until focus leaves the tab), the coarse-pointer
 * geometry, and the close label's locale switch.
 *
 * A tab is a `role="presentation"` wrapper holding the `role="tab"` and its
 * close control as siblings — a tab's children are presentational, so a close
 * button nested inside it would vanish from the accessibility tree (axe
 * `nested-interactive`). The `title` stays on the `tab` (a `title` on the
 * presentation wrapper would stop it being presentational, breaking the
 * tablist's required children), so the close control is its next sibling.
 * ARIA cannot expose that close control either: the presentation wrapper is
 * transparent, so a control inside it is an owned child of the `tablist`, and
 * a `tablist` may own only `tab`s (axe `aria-required-children`). The close
 * action lives on the tab (Delete, announced by `aria-keyshortcuts`) and the
 * ✕ is the pointer-user duplicate, hidden from the accessibility tree.
 *
 * Hover is driven with the `mouseenter`/`mouseleave` steps, which dispatch the
 * bubbling `mouseover`/`mouseout` pair React derives
 * `onMouseEnter`/`onMouseLeave` from (the same boundary pair every framework
 * binds), never with raw `mouseenter`: it does not bubble, so it could not
 * reach every framework the same way.
 *
 * The `dblclick` step presses, clicks twice and dispatches `dblclick` — the
 * two clicks are part of the step, so a plain tab records two `onSelect` calls
 * around its `onDoubleClick`, and a diff tab's second click replaces the
 * pending click timer, whose leaked predecessor still fires after the
 * double click cancelled the replacement (React's exact timer handling). The
 * goldens pin that behavior; the ports reproduce it timer for timer.
 *
 * @module
 */

import type { EditorTab } from '@molecule/app-code-editor'

import type { FeatureComponentCases } from '../../spec.js'

/** A TypeScript file most cases open. */
const APP = '/workspace/src/app.ts'
/** A Markdown file most cases open next to it. */
const README = '/workspace/README.md'
/** A stylesheet the git-status and diagnostic cases color. */
const STYLES = '/workspace/src/styles.css'

/**
 * A tab for the cases: `label`, `isDirty` and `isActive` are EditorTab's
 * required fields (the bar computes activity from `activeFile`, so they stay
 * off), and the per-case fields follow.
 *
 * @param path - The tab's file path.
 * @param extra - The per-case fields (`isDirty`, `isPreview`, `isDiff`,
 *   `diagnostics`).
 * @returns The tab.
 */
const tab = (path: string, extra: Partial<EditorTab> = {}): EditorTab => ({
  path,
  label: path.split('/').pop() ?? path,
  isDirty: false,
  isActive: false,
  ...extra,
})

/** The two-tab bar most interaction cases start from. */
const twoTabs = { tabs: [tab(APP), tab(README)], activeFile: null }

/** The second tab's element (attribute selectors reach it; `[role=tab]` only reaches the first). */
const README_TAB = `div[role="tab"][title="${README}"]`
/** The first tab's close control (the tab's next sibling, under the wrapper). */
const APP_CLOSE = `div[role="tab"][title="${APP}"] + button[data-mol-id="tab-close"]`
/** The first tab (the focusable `role="tab"`, not its presentation wrapper). */
const APP_TAB = 'div[role="tab"]'

/** `TabBar`. */
export const tabBarCases: FeatureComponentCases = {
  component: 'TabBar',
  keyedLists: [{ prop: 'tabs', selector: '[role="tab"]', caseName: 'tabs with none active' }],
  cases: [
    {
      name: 'no tabs',
      props: { tabs: [], activeFile: null },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
    },

    // ── The strip, its tabs and the active highlight ────────────────────────
    {
      name: 'one active tab',
      props: { tabs: [tab(APP)], activeFile: APP },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
    },
    {
      name: 'tabs with none active',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
    },
    {
      name: 'the active highlight follows the activeFile prop',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
      interactions: [{ type: 'props', props: { activeFile: README } }],
    },
    {
      name: 'the bar takes extra classes',
      props: { tabs: [tab(APP), tab(README)], activeFile: APP, className: 'parity-token' },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
      interactions: [{ type: 'props', props: { className: 'parity-token-wide' } }],
    },

    // ── Per-tab marks ────────────────────────────────────────────────────────
    {
      name: 'a dirty tab marks itself with a bullet',
      props: { tabs: [tab(APP, { isDirty: true })], activeFile: null },
      callbacks: ['onSelect', 'onClose'],
      interactions: [{ type: 'props', props: { tabs: [tab(APP)] } }],
    },
    {
      name: 'a preview tab is italic',
      props: { tabs: [tab(APP, { isPreview: true })], activeFile: null },
      callbacks: ['onSelect', 'onClose'],
    },

    // ── Filename colors ──────────────────────────────────────────────────────
    {
      name: 'git status colors the filename',
      props: {
        tabs: [tab(APP), tab(README), tab(STYLES)],
        activeFile: null,
        fileStatuses: { [APP]: 'modified', [README]: 'added', [STYLES]: 'untracked' },
      },
      callbacks: ['onSelect', 'onClose'],
    },
    {
      name: 'a deleted file is struck through',
      props: { tabs: [tab(APP)], activeFile: null, fileStatuses: { [APP]: 'deleted' } },
      callbacks: ['onSelect', 'onClose'],
    },
    {
      name: 'diagnostics color the filename: errors, then warnings',
      props: {
        tabs: [
          tab(APP, { diagnostics: { errors: 1, warnings: 1 } }),
          tab(README, { diagnostics: { errors: 0, warnings: 2 } }),
          tab(STYLES, { diagnostics: { errors: 0, warnings: 0 } }),
        ],
        activeFile: null,
      },
      callbacks: ['onSelect', 'onClose'],
    },
    {
      name: 'warnings beat a status, errors beat a deletion',
      props: {
        tabs: [
          tab(APP, { diagnostics: { errors: 0, warnings: 1 } }),
          tab(README, { diagnostics: { errors: 0, warnings: 1 } }),
          tab(STYLES, { diagnostics: { errors: 2, warnings: 0 } }),
        ],
        activeFile: null,
        fileStatuses: { [APP]: 'modified', [README]: 'deleted', [STYLES]: 'deleted' },
      },
      callbacks: ['onSelect', 'onClose'],
    },
    {
      name: 'a dark theme swaps every status and diagnostic color',
      props: {
        tabs: [
          tab(APP),
          tab(README, { diagnostics: { errors: 0, warnings: 1 } }),
          tab(STYLES, { diagnostics: { errors: 1, warnings: 0 } }),
        ],
        activeFile: null,
        fileStatuses: { [APP]: 'modified', [README]: 'deleted' },
      },
      callbacks: ['onSelect', 'onClose'],
      context: { theme: 'dark' },
    },
    {
      name: 'a diff tab keeps its git status but ignores the live diagnostics',
      props: {
        tabs: [tab(APP, { isDiff: true, diagnostics: { errors: 3, warnings: 0 } })],
        activeFile: APP,
        fileStatuses: { [APP]: 'modified' },
      },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
    },

    // ── Selection ────────────────────────────────────────────────────────────
    {
      name: 'a click selects its tab',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'click', selector: README_TAB },
        { type: 'click', selector: 'div[role="tab"]' },
      ],
    },
    {
      name: 'the keyboard selects the focused tab',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'keydown', selector: 'div[role="tab"]', key: 'Enter' },
        { type: 'keydown', selector: README_TAB, key: ' ' },
        { type: 'keydown', selector: README_TAB, key: 'Escape' },
      ],
    },
    {
      // The close button is out of the tab order (the tab's Delete key is the
      // keyboard path), so Delete on a focused tab closes it.
      name: 'the Delete key closes the focused tab',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'keydown', selector: APP_TAB, key: 'Delete' },
        { type: 'keydown', selector: README_TAB, key: 'Delete' },
      ],
    },
    {
      name: 'a double click reports the tab',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
      interactions: [{ type: 'dblclick', selector: README_TAB }],
    },
    {
      name: 'a tab without a double-click handler ignores a double click',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [{ type: 'dblclick', selector: README_TAB }],
    },

    // ── The close control ────────────────────────────────────────────────────
    {
      name: 'the close control stops the click and closes only its tab',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'click', selector: APP_CLOSE },
        { type: 'click', selector: `div[role="tab"]` },
      ],
    },

    // ── A diff tab's delayed click ───────────────────────────────────────────
    {
      name: 'a diff tab waits out the double-click window',
      props: { tabs: [tab(APP, { isDiff: true })], activeFile: APP },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: 'div[role="tab"]' },
        { type: 'advance', ms: 260 },
      ],
    },
    {
      name: 'a diff tab’s double click cancels the pending selection',
      props: { tabs: [tab(APP, { isDiff: true })], activeFile: APP },
      callbacks: ['onSelect', 'onClose', 'onDoubleClick'],
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: 'div[role="tab"]' },
        { type: 'dblclick', selector: 'div[role="tab"]' },
        { type: 'advance', ms: 300 },
      ],
    },

    // ── Hover ────────────────────────────────────────────────────────────────
    {
      name: 'hovering a tab reveals its close control',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'mouseenter', selector: 'div[role="tab"]' },
        { type: 'mouseleave', selector: 'div[role="tab"]' },
        { type: 'mouseenter', selector: README_TAB },
      ],
    },
    {
      name: 'hovering the close control lights it up',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'mouseenter', selector: APP_CLOSE },
        { type: 'mouseleave', selector: APP_CLOSE },
      ],
    },

    // ── Focus reveal ─────────────────────────────────────────────────────────
    // A keyboard user who tabs to a tab (or on to its close control) must see
    // the close control a mouse user sees on hover (WCAG 2.4.7). The `focus`
    // and `blur` steps dispatch the bubbling `focusin`/`focusout` pair every
    // framework binds, so focus moving from the tab to its close control is
    // one focused region, not a leave.
    {
      name: 'focusing a tab reveals its close button',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [{ type: 'focus', selector: 'div[role="tab"]' }],
    },
    {
      name: 'focus moving from the tab to its close button keeps it revealed',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'focus', selector: 'div[role="tab"]' },
        { type: 'focus', selector: APP_CLOSE },
      ],
    },
    {
      name: 'blur hides it again',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      interactions: [
        { type: 'focus', selector: 'div[role="tab"]' },
        { type: 'blur', selector: 'div[role="tab"]' },
      ],
    },

    // ── Touch-first geometry ─────────────────────────────────────────────────
    {
      name: 'a coarse pointer gets taller tabs and a dimmed close control',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      pointer: 'coarse',
      interactions: [
        {
          type: 'click',
          selector: `div[role="tab"][title="${README}"] + button[data-mol-id="tab-close"]`,
        },
        { type: 'mouseenter', selector: 'div[role="tab"]' },
      ],
    },

    // ── Locale ───────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-renders the close label',
      props: twoTabs,
      callbacks: ['onSelect', 'onClose'],
      context: {
        translations: {
          fr: {
            ide: {
              tabs: { close: 'Fermer {{fileName}}' },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
