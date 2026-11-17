/**
 * `SearchPanel` cases: the search-in-files panel's every state — the debounced
 * query (typing, the pending debounce after an unmount, the cleared query),
 * the toggle strips (`Aa` / `ab` / `.*` / `⋯`) and the flags each one adds to
 * the request, the include/exclude glob filters, the excluded-directories
 * editor (commit on blur and Enter, the parse that trims, drops invalid names
 * and dedupes, the draft that follows a replaced prop, the read-only lock),
 * the replace strip (reveal, the two-click confirm, the replace-all POST and
 * its re-search, the per-file ↻, the in-flight guard, the swallowed failure),
 * the results themselves (groups, match rows, the hover tint, the collapse,
 * the click that opens the file at its line), the summary lines (found,
 * truncated, none, searching), the swallowed replace failure, the theme,
 * viewport and pointer branches, and the locale switch. (The failing-search
 * reply itself is not a case: the panel logs it at warn level, and the
 * recorder fails on any console warning — the branch's DOM, an emptied panel
 * with `No results found`, is the `no results` shape the cleared query shows.)
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** Two grouped files with three matches, one nested path, two file types. */
const RESULTS = [
  {
    file: 'src/App.tsx',
    matches: [
      { line: 12, content: 'export const App = () => {' },
      { line: 30, content: 'export default App' },
    ],
  },
  { file: 'README.md', matches: [{ line: 3, content: '# App' }] },
]

/** The search reply the panel renders as the results above. */
const OK = { pattern: 'foo', results: RESULTS, totalCount: 3, truncated: false }

/** A truncated reply: the summary line says so. */
const TRUNCATED = { pattern: 'foo', results: RESULTS, totalCount: 250, truncated: true }

/** A reply with nothing left, as a replace-all that consumed the matches. */
const EMPTY = { pattern: 'foo', results: [], totalCount: 0, truncated: false }

/** A case-sensitive reply: one file survives. */
const CASE_OK = { pattern: 'foo', results: [RESULTS[0]], totalCount: 1, truncated: false }

/** The queries the panel issues (URLSearchParams' exact encoding). */
const GET_FOO = { method: 'GET', url: '/projects/p1/search?pattern=foo' }
const GET_CASE = { method: 'GET', url: '/projects/p1/search?pattern=foo&caseSensitive=1' }
const GET_WORD = { method: 'GET', url: '/projects/p1/search?pattern=foo&wholeWord=1' }
const GET_WORD_REGEX = { method: 'GET', url: '/projects/p1/search?pattern=foo&regex=1&wholeWord=1' }
const GET_INCLUDE = { method: 'GET', url: '/projects/p1/search?pattern=foo&include=*.ts' }
const GET_BOTH = {
  method: 'GET',
  url: '/projects/p1/search?pattern=foo&include=*.ts&exclude=*.min.js',
}
/** The bulk-replace route. */
const POST_REPLACE = { method: 'POST', url: '/projects/p1/replace' }

/** The search input. */
const QUERY_INPUT = 'input[type="text"]'

/** The replace input, once the strip is revealed. */
const REPLACE_INPUT = 'input[placeholder="Replace"]'

/** The include/exclude glob inputs. */
const INCLUDE_INPUT = 'input[placeholder="Files to include (e.g. *.ts)"]'
const EXCLUDE_INPUT = 'input[placeholder="Files to exclude (e.g. *.min.js)"]'

/** The excluded-directories editor. */
const EXCLUDED_INPUT = 'input[data-mol-id="search-excluded-dirs"]'

/** The default callbacks every interactive case records. */
const CALLBACKS = ['onResultClick', 'onExcludedDirsChange']

/** `SearchPanel`. */
export const searchPanelCases: FeatureComponentCases = {
  component: 'SearchPanel',
  cases: [
    // ── The query and the debounce ──────────────────────────────────────────
    {
      name: 'an empty search',
      props: { projectId: 'p1' },
      fakeTimers: true,
      interactions: [{ type: 'advance', ms: 300 }],
    },
    {
      name: 'typing searches after the debounce and lists the results',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'the searching line holds until the reply lands',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK, defer: true }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'http', ...GET_FOO, status: 200, data: OK },
      ],
    },
    {
      name: 'an unmount clears the pending debounce',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'unmount' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'clearing the query empties the panel',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-clear"]' },
        { type: 'advance', ms: 300 },
      ],
    },

    // ── The toggle strips ───────────────────────────────────────────────────
    {
      name: 'the match-case toggle re-searches at once and again after the debounce',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...GET_CASE, data: CASE_OK },
          { ...GET_CASE, data: { ...CASE_OK, results: [] } },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-toggle-case"]' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'the whole-word and regex toggles pass their flags',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...GET_WORD, data: OK },
          { ...GET_WORD_REGEX, data: OK },
          { ...GET_WORD_REGEX, data: OK },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-toggle-whole-word"]' },
        { type: 'click', selector: '[data-mol-id="search-toggle-regex"]' },
        { type: 'advance', ms: 300 },
      ],
    },

    // ── The filters ─────────────────────────────────────────────────────────
    {
      name: 'the glob filters pass include and exclude',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...GET_INCLUDE, data: OK },
          { ...GET_BOTH, data: OK },
          { ...GET_BOTH, data: OK },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-toggle-filters"]' },
        { type: 'input', selector: INCLUDE_INPUT, value: '*.ts' },
        { type: 'input', selector: EXCLUDE_INPUT, value: '*.min.js' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'editing the excluded folders commits a trimmed, deduped set on blur',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'click', selector: '[data-mol-id="search-toggle-filters"]' },
        { type: 'input', selector: EXCLUDED_INPUT, value: 'node_modules, docs , bad~name, docs' },
        { type: 'blur', selector: EXCLUDED_INPUT },
      ],
    },
    {
      name: 'Enter commits the excluded folders too',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'click', selector: '[data-mol-id="search-toggle-filters"]' },
        { type: 'input', selector: EXCLUDED_INPUT, value: 'src' },
        { type: 'keydown', selector: EXCLUDED_INPUT, key: 'Enter' },
      ],
    },
    {
      name: 'a replaced excludedDirs prop rewrites the draft',
      props: { projectId: 'p1', excludedDirs: ['docs', 'dist'] },
      callbacks: CALLBACKS,
      interactions: [{ type: 'props', props: { excludedDirs: ['src', 'readme'] } }],
    },

    // ── Read-only mode ──────────────────────────────────────────────────────
    {
      name: 'read-only mode hides replace and locks the folders input',
      props: { projectId: 'p1', readOnly: true },
      callbacks: ['onResultClick'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="search-toggle-filters"]' },
        { type: 'input', selector: EXCLUDED_INPUT, value: 'docs' },
        { type: 'blur', selector: EXCLUDED_INPUT },
      ],
    },
    {
      name: 'flipping read-only removes the replace strip',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'props', props: { readOnly: true } },
      ],
    },

    // ── Replace ─────────────────────────────────────────────────────────────
    {
      name: 'replace all confirms, posts and re-searches',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...POST_REPLACE, data: { replaced: 3 } },
          { ...GET_FOO, data: EMPTY },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'input', selector: REPLACE_INPUT, value: 'bar' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
      ],
    },
    {
      name: 'the replace button waits, disabled, until the replace settles',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...POST_REPLACE, data: { replaced: 3 }, defer: true },
          { ...GET_FOO, data: EMPTY },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'input', selector: REPLACE_INPUT, value: 'bar' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
        { type: 'http', ...POST_REPLACE, status: 200, data: { replaced: 3 } },
      ],
    },
    {
      name: 'replace in this file posts just that file',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...POST_REPLACE, data: { replaced: 2 } },
          { ...GET_FOO, data: EMPTY },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'click', selector: '[data-mol-id="search-replace-in-file"]' },
      ],
    },
    {
      name: 'a failed replace is swallowed and leaves the results alone',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [
          { ...GET_FOO, data: OK },
          { ...POST_REPLACE, status: 500, data: { error: 'no' } },
        ],
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'input', selector: REPLACE_INPUT, value: 'bar' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
      ],
    },

    // ── The results ─────────────────────────────────────────────────────────
    {
      name: 'the truncated summary says so',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: TRUNCATED }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'hovering a match tints the row and leaving clears it',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'mouseenter', selector: '[data-mol-id="search-match"]' },
        { type: 'mouseleave', selector: '[data-mol-id="search-match"]' },
      ],
    },
    {
      name: 'collapsing a file hides its matches and expanding restores them',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-file-toggle"]' },
        { type: 'click', selector: '[data-mol-id="search-file-toggle"]' },
      ],
    },
    {
      name: 'clicking a match opens the file at its line',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-match"]' },
      ],
    },

    // ── Locale, theme, viewport, pointer ────────────────────────────────────
    {
      name: 'a locale switch translates the panel',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: {
        http: [{ ...GET_FOO, data: OK }],
        locale: 'en',
        translations: {
          en: {
            ide: {
              search: {
                placeholder: 'Search',
                clear: 'Clear',
                toggleReplace: 'Toggle Replace',
                replacePlaceholder: 'Replace',
                replaceAll: 'Replace All',
                replaceAllShort: 'All',
                confirm: 'Confirm',
                confirmReplaceAll: 'Click again to confirm',
                replaceConfirmation: 'Replace {{count}} occurrences in {{files}} files?',
                caseSensitive: 'Match Case',
                wholeWord: 'Match Whole Word',
                regex: 'Use Regular Expression',
                toggleFilters: 'Toggle Filters',
                includeFiles: 'Files to include (e.g. *.ts)',
                excludeFiles: 'Files to exclude (e.g. *.min.js)',
                excludedDirs: 'Excluded folders (applies to all searches, including the agent)',
                noResults: 'No results found',
                searching: 'Searching…',
                results: '{{count}} results in {{files}} files',
                resultsTruncated: '{{count}} results in {{files}} files (truncated)',
                replaceInFile: 'Replace in this file',
              },
            },
          },
          fr: {
            ide: {
              search: {
                placeholder: 'Rechercher',
                clear: 'Effacer',
                toggleReplace: 'Basculer le remplacement',
                replacePlaceholder: 'Remplacer',
                replaceAll: 'Tout remplacer',
                replaceAllShort: 'Tout',
                confirm: 'Confirmer',
                confirmReplaceAll: 'Cliquez à nouveau pour confirmer',
                replaceConfirmation: 'Remplacer {{count}} occurrences dans {{files}} fichiers ?',
                caseSensitive: 'Respecter la casse',
                wholeWord: 'Mot entier',
                regex: 'Expression régulière',
                toggleFilters: 'Basculer les filtres',
                includeFiles: 'Fichiers à inclure (ex. *.ts)',
                excludeFiles: 'Fichiers à exclure (ex. *.min.js)',
                excludedDirs: 'Dossiers exclus (pour toutes les recherches, agent inclus)',
                noResults: 'Aucun résultat',
                searching: 'Recherche…',
                results: '{{count}} résultats dans {{files}} fichiers',
                resultsTruncated: '{{count}} résultats dans {{files}} fichiers (tronqué)',
                replaceInFile: 'Remplacer dans ce fichier',
              },
            },
          },
        },
      },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'input', selector: REPLACE_INPUT, value: 'bar' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
        { type: 'locale', locale: 'fr' },
      ],
    },
    {
      name: 'the dark theme tints the rows',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      context: { http: [{ ...GET_FOO, data: OK }], theme: 'dark' },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
        { type: 'input', selector: REPLACE_INPUT, value: 'bar' },
        { type: 'click', selector: '[data-mol-id="search-replace-all"]' },
      ],
    },
    {
      name: 'a narrow viewport enlarges the inputs',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      viewportWidth: 390,
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-toggle-filters"]' },
      ],
    },
    {
      name: 'a coarse pointer widens the replace column',
      props: { projectId: 'p1' },
      callbacks: CALLBACKS,
      fakeTimers: true,
      pointer: 'coarse',
      context: { http: [{ ...GET_FOO, data: OK }] },
      interactions: [
        { type: 'input', selector: QUERY_INPUT, value: 'foo' },
        { type: 'advance', ms: 300 },
        { type: 'click', selector: '[data-mol-id="search-replace-toggle"]' },
      ],
    },

    // ── The className prop ──────────────────────────────────────────────────
    {
      name: 'the className lands on the root element',
      props: { projectId: 'p1', className: 'wide-panel' },
      callbacks: CALLBACKS,
    },
  ],
}
