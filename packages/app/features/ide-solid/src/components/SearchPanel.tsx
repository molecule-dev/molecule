/**
 * Search-in-files panel — provides grep-like search and replace across the
 * project sandbox.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `SearchPanel` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The query is debounced (300 ms) into a
 * `GET /projects/:id/search` whose reply groups the matches per file; the
 * option toggles (`Aa` / `ab` / `.*`) re-search at once, the glob filters ride
 * the same request, and the excluded-directories editor commits a trimmed,
 * deduped set on blur or Enter for the host to persist. The replace strip
 * confirms with a second click, posts the bulk replace and re-searches.
 *
 * The style objects come from function CALLS, not inline literals: the Solid
 * JSX transform compiles an inline style object into one raw `style`
 * attribute string, whose one-shot parse loses the shorthand expansions React
 * writes through the CSSOM. All user-facing text goes through `t()`.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import {
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'

import type { SearchPanelProps, SearchResponse, SearchResult } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SEARCH_EXCLUDED_DIRS } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-solid'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

const logger = getLogger('search')

/** A plain style record the Solid style binding applies through `setProperty`. */
type Style = Record<string, string>

/**
 * Extract the filename from a full path for the file icon.
 * @param path - Full file path.
 * @returns The filename portion.
 */
function basename(path: string): string {
  return path.split('/').pop() ?? path
}

/** The group wrapper (React's `marginBottom: 2`). */
const groupStyle = (): Style => ({ 'margin-bottom': '2px' })

/** The file row's strip (React's `isLight` tint). */
const groupHeaderStyle = (isLight: boolean): Style => ({
  display: 'flex',
  'align-items': 'center',
  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
})

/** The collapsible file row. */
const fileToggleStyle = (): Style => ({
  display: 'flex',
  'align-items': 'center',
  gap: '4px',
  flex: '1',
  padding: '3px 8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--mol-color-text, currentColor)',
  cursor: 'pointer',
  'font-size': '12px',
  'text-align': 'left',
  // The row must be allowed to shrink below its content for the path to
  // ellipsize; the min-HEIGHT half of the touch-target class — the part that
  // matters for a tap target — stays.
  'min-width': '0px',
})

/** The ▶/▼ chevron. */
const chevronStyle = (): Style => ({
  'font-size': '10px',
  width: '12px',
  'text-align': 'center',
  'flex-shrink': '0',
})

/** The file path's ellipsizing span. */
const pathStyle = (): Style => ({
  flex: '1',
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
})

/** The per-file match-count badge. */
const countBadgeStyle = (isLight: boolean): Style => ({
  'font-size': '10px',
  padding: '1px 5px',
  'border-radius': '8px',
  background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
  'flex-shrink': '0',
})

/** The ↻ replace-in-file affordance. */
const replaceInFileStyle = (): Style => ({
  padding: '2px 6px',
  'margin-right': '4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--mol-color-text-secondary, #888)',
  cursor: 'pointer',
  'font-size': '11px',
})

/** A match row. */
const matchRowStyle = (): Style => ({
  display: 'flex',
  'align-items': 'center',
  gap: '6px',
  width: '100%',
  padding: '2px 8px 2px 32px',
  border: 'none',
  background: 'transparent',
  color: 'var(--mol-color-text, currentColor)',
  cursor: 'pointer',
  'font-size': '12px',
  'text-align': 'left',
  'font-family': 'monospace',
})

/** The match row's line number. */
const lineNumberStyle = (): Style => ({
  color: 'var(--mol-color-text-secondary, #888)',
  'flex-shrink': '0',
  'min-width': '30px',
  'text-align': 'right',
})

/** The match row's source-line span. */
const lineContentStyle = (): Style => ({
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
})

/** The search/replace input row's strip. */
const inputRowStyle = (): Style => ({ display: 'flex', gap: '4px', 'align-items': 'center' })

/** The panel's padded header block. */
const headerStyle = (): Style => ({ padding: '8px 8px 4px 8px' })

/**
 * The glyph toggle's compact monospace box (React's `ToggleButton` style).
 *
 * @param active - Whether the option is on.
 * @returns The style.
 */
const toggleStyle = (active: boolean): Style => ({
  padding: '2px 5px',
  'font-size': '11px',
  'font-family': 'monospace',
  border: '1px solid',
  'border-color': active ? 'var(--mol-color-primary, #4070e0)' : 'var(--color-border, #333)',
  'border-radius': '3px',
  background: active
    ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
    : 'transparent',
  color: active ? 'var(--mol-color-primary, #4070e0)' : 'var(--mol-color-text-secondary, #888)',
  cursor: 'pointer',
  'line-height': '1',
})

/**
 * The icon-only chevron in the search input's left gutter.
 *
 * @param width - The alignment column's width in px.
 * @returns The style.
 */
const replaceToggleStyle = (width: number): Style => ({
  padding: '0',
  border: 'none',
  background: 'transparent',
  color: 'var(--mol-color-text-secondary, #888)',
  cursor: 'pointer',
  'font-size': '10px',
  'line-height': '1',
  // The chevron column's width is what the replace input aligns against.
  width: `${width}px`,
  'text-align': 'center',
})

/** The icon-only × that clears the query. */
const clearStyle = (): Style => ({
  padding: '2px 4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--mol-color-text-secondary, #888)',
  cursor: 'pointer',
  'font-size': '14px',
  'line-height': '1',
})

/** The replace input's row (React's `marginTop: 4`). */
const replaceRowStyle = (): Style => ({
  display: 'flex',
  gap: '4px',
  'align-items': 'center',
  'margin-top': '4px',
})

/** The spacer that aligns the replace input under the search input. */
const spacerStyle = (width: number): Style => ({ width: `${width}px`, 'flex-shrink': '0' })

/**
 * The amber confirmation strip under the replace input.
 *
 * @param isLight - Whether the light theme tints it.
 * @param width - The chevron column's width in px.
 * @returns The style.
 */
const confirmSummaryStyle = (isLight: boolean, width: number): Style => ({
  'margin-top': '4px',
  // Aligns under the inputs: toggle-arrow width + the 4px row gap.
  'margin-left': `${width + 4}px`,
  padding: '3px 6px',
  'font-size': '11px',
  'border-radius': '3px',
  background: isLight ? 'rgba(200,120,0,0.1)' : 'rgba(200,120,0,0.15)',
  color: isLight ? '#8a5000' : '#e0a030',
})

/** The toggle strip under the inputs. */
const toggleStripStyle = (): Style => ({
  display: 'flex',
  gap: '4px',
  'margin-top': '4px',
  'align-items': 'center',
})

/** The filters block. */
const filtersStyle = (): Style => ({
  display: 'flex',
  'flex-direction': 'column',
  gap: '4px',
  'margin-top': '4px',
})

/** The excluded-directories editor's block. */
const excludedDirsStyle = (): Style => ({ display: 'flex', 'flex-direction': 'column', gap: '2px' })

/** The excluded-directories label. */
const excludedLabelStyle = (): Style => ({
  'font-size': '10px',
  color: 'var(--mol-color-text-secondary, #888)',
})

/**
 * The results-summary line.
 *
 * @returns The style.
 */
const summaryStyle = (): Style => ({
  padding: '2px 8px 4px 8px',
  'font-size': '11px',
  color: 'var(--mol-color-text-secondary, #888)',
})

/** The failed-request line (its colour is the ClassMap's `textError`). */
const errorStyle = (): Style => ({ padding: '2px 8px 4px 8px', 'font-size': '11px' })

/** The "Searching…" line. */
const searchingStyle = (): Style => ({
  padding: '2px 8px',
  'font-size': '11px',
  color: 'var(--mol-color-text-secondary, #888)',
})

/** The results list. */
const listStyle = (): Style => ({ flex: '1', overflow: 'auto', 'min-height': '0px' })

/** The panel's root (React's `display: flex; flexDirection: column; height: '100%'`). */
const rootStyle = (): Style => ({ display: 'flex', 'flex-direction': 'column', height: '100%' })

/** The flex spacer in the toggle strip. */
const flexSpacerStyle = (): Style => ({ flex: '1' })

/**
 * The file-type icon: the material-file-icons SVG injected into a fixed-size
 * span, the way React's `FileTypeIcon` renders it.
 *
 * @param props - Component props.
 * @returns The file icon element.
 */
function FileTypeIcon(props: { name: string }): JSX.Element {
  const iconStyle = (): Style => ({
    display: 'inline-flex',
    'flex-shrink': '0',
    width: '16px',
    height: '16px',
  })
  return <span style={iconStyle()} innerHTML={getIcon(props.name).svg} />
}

/**
 * Glyph toggle for a search option (match case, whole word, regex, filters) —
 * deliberately NOT a `cm.button()` CTA; see React's file. The translated
 * `title` is the accessible name; the glyph itself is decorative.
 *
 * @param props - Component props.
 * @returns The toggle button element.
 */
function ToggleButton(props: {
  active: boolean
  onClick: () => void
  title: string
  /** Stable id for agents/tests. */
  molId: string
  /** The decorative glyph (`Aa`, `ab`, `.*`, `⋯`). */
  glyph: string
}): JSX.Element {
  const cm = getClassMap()
  return (
    <button
      type="button"
      title={props.title}
      // The glyph (`Aa`, `ab`, `.*`, `⋯`) is NOT the name: the translated
      // `title` is the accessible name; the glyph itself is decorative.
      aria-label={props.title}
      aria-pressed={props.active ? 'true' : 'false'}
      data-mol-id={props.molId}
      onClick={props.onClick}
      class={cm.touchTargetCompact}
      style={toggleStyle(props.active)}
    >
      <span aria-hidden="true">{props.glyph}</span>
    </button>
  )
}

/**
 * The replace strip's action button — a real design-system CTA (see React's
 * file).
 *
 * @param props - Component props.
 * @returns The action button element.
 */
function ActionButton(props: {
  onClick: () => void
  title: string
  /** Stable id for agents/tests. */
  molId: string
  /** Semantic CTA colour (DESIGN.md → CTA color semantics). */
  color: ColorVariant
  /** The label text. */
  label: string
  disabled?: boolean
}): JSX.Element {
  const cm = getClassMap()
  return (
    <button
      type="button"
      title={props.title}
      data-mol-id={props.molId}
      onClick={props.onClick}
      disabled={props.disabled}
      class={cm.cn(
        cm.button({ variant: 'solid', color: props.color, size: 'xs' }),
        cm.touchTargetCompact,
        cm.shrink0,
      )}
    >
      {props.label}
    </button>
  )
}

/**
 * Collapsible result group for a single file (React's internal
 * `FileResultGroup`).
 *
 * @param props - Component props.
 * @returns The result group element.
 */
function FileResultGroup(props: {
  result: SearchResult
  onResultClick?: (path: string, line: number) => void
  onReplaceInFile?: (path: string) => void
  isLight: boolean
  showReplace: boolean
}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = createSignal(false)

  /** The match row's hover tint, written straight onto the element (React's `onMouseEnter`). */
  const rowOver = (e: MouseEvent): void => {
    ;(e.currentTarget as HTMLElement).style.background = props.isLight
      ? 'rgba(0,0,0,0.06)'
      : 'rgba(255,255,255,0.06)'
  }

  /** Clears the hover tint (React's `onMouseLeave`). */
  const rowOut = (e: MouseEvent): void => {
    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
  }

  return (
    <div style={groupStyle()}>
      <div style={groupHeaderStyle(props.isLight)}>
        <button
          type="button"
          data-mol-id="search-file-toggle"
          aria-expanded={collapsed() ? 'false' : 'true'}
          onClick={() => setCollapsed(!collapsed())}
          class={cm.touchTargetCompact}
          style={fileToggleStyle()}
        >
          <span style={chevronStyle()}>{collapsed() ? '▶' : '▼'}</span>
          <FileTypeIcon name={basename(props.result.file)} />
          <span style={pathStyle()}>{props.result.file}</span>
          <span style={countBadgeStyle(props.isLight)}>{props.result.matches.length}</span>
        </button>
        {props.showReplace && props.onReplaceInFile && (
          <button
            type="button"
            data-mol-id="search-replace-in-file"
            onClick={() => props.onReplaceInFile?.(props.result.file)}
            title={t('ide.search.replaceInFile', undefined, {
              defaultValue: 'Replace in this file',
            })}
            class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
            style={replaceInFileStyle()}
          >
            ↻
          </button>
        )}
      </div>
      {!collapsed() &&
        props.result.matches.map((match) => (
          <button
            type="button"
            data-mol-id="search-match"
            onClick={() => props.onResultClick?.(props.result.file, match.line)}
            class={cm.touchTargetCompact}
            style={matchRowStyle()}
            onMouseEnter={rowOver}
            onMouseLeave={rowOut}
          >
            <span style={lineNumberStyle()}>{match.line}</span>
            <span style={lineContentStyle()}>{match.content}</span>
          </button>
        ))}
    </div>
  )
}

/**
 * Search-in-files panel for the IDE sidebar with find-and-replace support.
 *
 * @param props - See {@link SearchPanelProps}.
 * @returns The search panel element.
 */
export function SearchPanel(props: SearchPanelProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const http = useHttpClient()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const isLight = createMemo(() => mode() === 'light')
  // iOS Safari zooms the whole page when a focused input's font-size is under
  // 16px — text inputs bump to 16px on phones/touch devices.
  const inputFontSize = createMemo(() => (isNarrow() || isCoarse() ? '16px' : '12px'))
  const filterFontSize = createMemo(() => (isNarrow() || isCoarse() ? '16px' : '11px'))
  // The replace expand toggle (and the spacer that aligns the replace input
  // under the search input) widen together on touch-first devices.
  const replaceToggleWidth = createMemo(() => (isCoarse() ? 36 : 14))

  const [query, setQuery] = createSignal('')
  const [caseSensitive, setCaseSensitive] = createSignal(false)
  const [useRegex, setUseRegex] = createSignal(false)
  const [wholeWord, setWholeWord] = createSignal(false)
  const [includeGlob, setIncludeGlob] = createSignal('')
  const [excludeGlob, setExcludeGlob] = createSignal('')
  const [showFilters, setShowFilters] = createSignal(false)

  // Excluded-dirs editor (VS Code search.exclude): draft text tracks the prop
  // (comma-separated); commit on blur/Enter parses, dedupes, and hands the set
  // to the host to persist.
  const effectiveExcluded = createMemo(
    () => props.excludedDirs ?? [...DEFAULT_SEARCH_EXCLUDED_DIRS],
  )
  const [excludedDirsDraft, setExcludedDirsDraft] = createSignal(effectiveExcluded().join(', '))
  createEffect(() => {
    const key = effectiveExcluded().join(',')
    setExcludedDirsDraft(key.split(',').filter(Boolean).join(', '))
  })

  /**
   * Commits the draft: parses, drops invalid names, dedupes, normalizes the
   * field and hands the set to the host when it changed.
   */
  const commitExcludedDirs = (): void => {
    const dirs = [
      ...new Set(
        excludedDirsDraft()
          .split(',')
          .map((d) => d.trim())
          .filter((d) => /^[A-Za-z0-9._-]+$/.test(d)),
      ),
    ]
    setExcludedDirsDraft(dirs.join(', '))
    if (dirs.join(',') !== effectiveExcluded().join(',')) props.onExcludedDirsChange?.(dirs)
  }

  const [results, setResults] = createSignal<SearchResult[]>([])
  const [totalCount, setTotalCount] = createSignal(0)
  const [truncated, setTruncated] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [searched, setSearched] = createSignal(false)
  // The request that failed last, shown in place of the results summary; a search that succeeds clears it.
  const [failure, setFailure] = createSignal<'search' | 'replace' | null>(null)

  // Replace state
  const [showReplace, setShowReplace] = createSignal(false)
  const [replacement, setReplacement] = createSignal('')
  const [replacing, setReplacing] = createSignal(false)
  const [confirmAll, setConfirmAll] = createSignal(false)

  let debounceId: ReturnType<typeof setTimeout> | undefined
  let abortRef: AbortController | undefined
  let inputEl: HTMLInputElement | undefined

  /**
   * Runs the search for `pattern` (React's `doSearch`): aborts the previous
   * in-flight request, resets on a blank pattern, and applies the reply —
   * unless a later search superseded it.
   *
   * @param pattern - The raw query text.
   */
  const doSearch = async (pattern: string): Promise<void> => {
    if (!pattern.trim()) {
      setResults([])
      setTotalCount(0)
      setTruncated(false)
      setSearched(false)
      setFailure(null)
      return
    }

    // Abort previous in-flight search
    abortRef?.abort()
    const controller = new AbortController()
    abortRef = controller

    setLoading(true)
    try {
      const params = new URLSearchParams({ pattern })
      if (untrack(caseSensitive)) params.set('caseSensitive', '1')
      if (untrack(useRegex)) params.set('regex', '1')
      if (untrack(wholeWord)) params.set('wholeWord', '1')
      if (untrack(includeGlob).trim()) params.set('include', untrack(includeGlob).trim())
      if (untrack(excludeGlob).trim()) params.set('exclude', untrack(excludeGlob).trim())

      const res = await http.get<SearchResponse>(
        `/projects/${props.projectId}/search?${params.toString()}`,
      )
      if (controller.signal.aborted) return
      setResults(res.data.results)
      setTotalCount(res.data.totalCount)
      setTruncated(res.data.truncated)
      setSearched(true)
      setFailure(null)
    } catch (error) {
      if (!controller.signal.aborted) {
        logger.warn('Search request failed', { error })
        setResults([])
        setTotalCount(0)
        setSearched(true)
        setFailure('search')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  // Debounced search on query change (React's effect on `[query, doSearch]`;
  // `doSearch` moves whenever the request options below move).
  createEffect(() => {
    query()
    void props.projectId
    caseSensitive()
    useRegex()
    wholeWord()
    includeGlob()
    excludeGlob()
    if (debounceId !== undefined) clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      void doSearch(untrack(query))
    }, 300)
    onCleanup(() => {
      if (debounceId !== undefined) clearTimeout(debounceId)
    })
  })

  // Re-search immediately when the toggle options change (if we have a query)
  createEffect(() => {
    caseSensitive()
    useRegex()
    wholeWord()
    includeGlob()
    excludeGlob()
    untrack(() => {
      if (query().trim()) void doSearch(query())
    })
  })

  onMount(() => {
    inputEl?.focus()
  })

  /**
   * Posts the bulk replace, then re-searches to update the results (React's
   * `doReplace`). A failed replace is logged and still re-searches, since it
   * may have changed some files first, and then shows the replace failure.
   *
   * @param targetFiles - The files to replace in (all when omitted).
   */
  const doReplace = async (targetFiles?: string[]): Promise<void> => {
    if (!untrack(query).trim()) return
    setReplacing(true)
    let replaceFailed = false
    try {
      await http.post(`/projects/${props.projectId}/replace`, {
        pattern: untrack(query),
        replacement: untrack(replacement),
        files: targetFiles,
        caseSensitive: untrack(caseSensitive),
        regex: untrack(useRegex),
        wholeWord: untrack(wholeWord),
      })
    } catch (error) {
      logger.warn('Replace request failed', { error, files: targetFiles })
      replaceFailed = true
    }
    try {
      // Re-search to update results (doSearch handles its own failure)
      await doSearch(untrack(query))
      // Unless the re-search failed too: the results then show nothing, and the search failure says so.
      if (replaceFailed && untrack(failure) !== 'search') setFailure('replace')
    } finally {
      setReplacing(false)
      setConfirmAll(false)
    }
  }

  /** The two-click confirm, then the replace (React's `handleReplaceAll`). */
  const handleReplaceAll = (): void => {
    if (confirmAll()) {
      void doReplace()
    } else {
      setConfirmAll(true)
    }
  }

  /**
   * Replaces within one file (React's `handleReplaceInFile`).
   *
   * @param file - The file's path.
   */
  const handleReplaceInFile = (file: string): void => {
    void doReplace([file])
  }

  /** The search and replace inputs' shared field look. */
  const fieldStyle = (): Style => ({
    flex: '1',
    padding: '4px 6px',
    'font-size': inputFontSize(),
    border: '1px solid var(--color-border, #333)',
    'border-radius': '3px',
    background: isLight() ? '#fff' : 'rgba(255,255,255,0.06)',
    color: 'var(--mol-color-text, currentColor)',
    outline: 'none',
    'min-width': '0px',
  })

  /** The include/exclude/excluded-dirs inputs' shared look. */
  const filterStyle = (): Style => ({
    padding: '3px 6px',
    'font-size': filterFontSize(),
    border: '1px solid var(--color-border, #333)',
    'border-radius': '3px',
    background: isLight() ? '#fff' : 'rgba(255,255,255,0.06)',
    color: 'var(--mol-color-text, currentColor)',
    outline: 'none',
  })

  // React keeps the controlled fields' `value` ATTRIBUTE in step with the
  // value (the DOM snapshot carries it as well as the live property); Solid's
  // `value` writes only the property, so the attributes are mirrored here —
  // at ref time (the filters' inputs render lazily) and on every change after.
  createEffect(() => {
    inputEl?.setAttribute('value', query())
  })
  let replaceEl: HTMLInputElement | undefined
  createEffect(() => {
    // The signal read comes FIRST: optional chaining would short-circuit it
    // while the strip is closed, leave the effect without its dependency, and
    // the field's attribute would never follow the value.
    const value = replacement()
    replaceEl?.setAttribute('value', value)
  })
  let includeEl: HTMLInputElement | undefined
  createEffect(() => {
    const value = includeGlob()
    includeEl?.setAttribute('value', value)
  })
  let excludeEl: HTMLInputElement | undefined
  createEffect(() => {
    const value = excludeGlob()
    excludeEl?.setAttribute('value', value)
  })
  let excludedEl: HTMLInputElement | undefined
  createEffect(() => {
    const value = excludedDirsDraft()
    excludedEl?.setAttribute('value', value)
  })

  const fileCount = createMemo(() => results().length)

  return (
    <div class={cm.cn(props.className)} style={rootStyle()}>
      {/* Search input row */}
      <div style={headerStyle()}>
        <div style={inputRowStyle()}>
          {/* Replace expand toggle — hidden in read-only mode */}
          {!props.readOnly && (
            <button
              type="button"
              data-mol-id="search-replace-toggle"
              aria-expanded={showReplace() ? 'true' : 'false'}
              onClick={() => {
                setShowReplace(!showReplace())
                setConfirmAll(false)
              }}
              title={t('ide.search.toggleReplace', undefined, { defaultValue: 'Toggle Replace' })}
              class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
              style={replaceToggleStyle(replaceToggleWidth())}
            >
              {showReplace() ? '▼' : '▶'}
            </button>
          )}
          <input
            ref={(el) => {
              inputEl = el
            }}
            type="text"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            placeholder={t('ide.search.placeholder', undefined, { defaultValue: 'Search' })}
            style={fieldStyle()}
          />
          {query() && (
            <button
              type="button"
              data-mol-id="search-clear"
              onClick={() => setQuery('')}
              title={t('ide.search.clear', undefined, { defaultValue: 'Clear' })}
              aria-label={t('ide.search.clear', undefined, { defaultValue: 'Clear' })}
              class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
              style={clearStyle()}
            >
              ×
            </button>
          )}
        </div>

        {/* Replace input */}
        {!props.readOnly && showReplace() && (
          <div style={replaceRowStyle()}>
            {/* Spacer to align with the search input (same width as the toggle arrow) */}
            <div style={spacerStyle(replaceToggleWidth())} />
            <input
              ref={(el) => {
                replaceEl = el
                // The value property lands after refs in Solid, so the
                // attribute mirrors the signal, not the just-empty property.
                el.setAttribute('value', replacement())
              }}
              type="text"
              value={replacement()}
              onInput={(e) => {
                setReplacement(e.currentTarget.value)
                setConfirmAll(false)
              }}
              placeholder={t('ide.search.replacePlaceholder', undefined, {
                defaultValue: 'Replace',
              })}
              style={fieldStyle()}
            />
            <ActionButton
              onClick={handleReplaceAll}
              title={
                confirmAll()
                  ? t('ide.search.confirmReplaceAll', undefined, {
                      defaultValue: 'Click again to confirm',
                    })
                  : t('ide.search.replaceAll', undefined, { defaultValue: 'Replace All' })
              }
              molId="search-replace-all"
              // Amber while it waits for the second click — the same warning
              // semantic the confirmation strip below it uses.
              color={confirmAll() ? 'warning' : 'primary'}
              disabled={!query().trim() || replacing()}
              label={
                replacing()
                  ? '…'
                  : confirmAll()
                    ? t('ide.search.confirm', undefined, { defaultValue: 'Confirm' })
                    : t('ide.search.replaceAllShort', undefined, { defaultValue: 'All' })
              }
            />
          </div>
        )}

        {/* Replace summary */}
        {!props.readOnly && showReplace() && confirmAll() && totalCount() > 0 && (
          <div style={confirmSummaryStyle(isLight(), replaceToggleWidth())}>
            {t(
              'ide.search.replaceConfirmation',
              { count: totalCount(), files: fileCount() },
              { defaultValue: 'Replace {{count}} occurrences in {{files}} files?' },
            )}
          </div>
        )}

        {/* Toggle buttons */}
        <div style={toggleStripStyle()}>
          <ToggleButton
            active={caseSensitive()}
            onClick={() => setCaseSensitive(!caseSensitive())}
            title={t('ide.search.caseSensitive', undefined, { defaultValue: 'Match Case' })}
            molId="search-toggle-case"
            glyph="Aa"
          />
          <ToggleButton
            active={wholeWord()}
            onClick={() => setWholeWord(!wholeWord())}
            title={t('ide.search.wholeWord', undefined, { defaultValue: 'Match Whole Word' })}
            molId="search-toggle-whole-word"
            glyph="ab"
          />
          <ToggleButton
            active={useRegex()}
            onClick={() => setUseRegex(!useRegex())}
            title={t('ide.search.regex', undefined, { defaultValue: 'Use Regular Expression' })}
            molId="search-toggle-regex"
            glyph=".*"
          />
          <div style={flexSpacerStyle()} />
          <ToggleButton
            active={showFilters()}
            onClick={() => setShowFilters(!showFilters())}
            title={t('ide.search.toggleFilters', undefined, { defaultValue: 'Toggle Filters' })}
            molId="search-toggle-filters"
            glyph="⋯"
          />
        </div>

        {/* Include/Exclude filters */}
        {showFilters() && (
          <div style={filtersStyle()}>
            <input
              ref={(el) => {
                includeEl = el
                // The value property lands after refs in Solid, so the
                // attribute mirrors the signal, not the just-empty property.
                el.setAttribute('value', includeGlob())
              }}
              type="text"
              value={includeGlob()}
              onInput={(e) => setIncludeGlob(e.currentTarget.value)}
              placeholder={t('ide.search.includeFiles', undefined, {
                defaultValue: 'Files to include (e.g. *.ts)',
              })}
              style={filterStyle()}
            />
            <input
              ref={(el) => {
                excludeEl = el
                // The value property lands after refs in Solid, so the
                // attribute mirrors the signal, not the just-empty property.
                el.setAttribute('value', excludeGlob())
              }}
              type="text"
              value={excludeGlob()}
              onInput={(e) => setExcludeGlob(e.currentTarget.value)}
              placeholder={t('ide.search.excludeFiles', undefined, {
                defaultValue: 'Files to exclude (e.g. *.min.js)',
              })}
              style={filterStyle()}
            />
            {/* Excluded directories (VS Code search.exclude) — the
                project-wide set the SERVER applies to every search surface.
                Edited here, persisted by the host. */}
            <div style={excludedDirsStyle()}>
              <label style={excludedLabelStyle()} for="mol-search-excluded-dirs">
                {t('ide.search.excludedDirs', undefined, {
                  defaultValue: 'Excluded folders (applies to all searches, including the agent)',
                })}
              </label>
              <input
                ref={(el) => {
                  excludedEl = el
                  // The value property lands after refs in Solid, so the
                  // attribute mirrors the signal, not the just-empty property.
                  el.setAttribute('value', excludedDirsDraft())
                }}
                id="mol-search-excluded-dirs"
                type="text"
                data-mol-id="search-excluded-dirs"
                // The placeholder is an EXAMPLE of the input (directory names) —
                // the same in every language, never a sentence to translate.
                translate="no"
                value={excludedDirsDraft()}
                // Read-only viewers can see the set but not edit it.
                readonly={props.readOnly === true}
                onInput={(e) => setExcludedDirsDraft(e.currentTarget.value)}
                // React's synthetic onBlur derives from the bubbling `focusout`
                // (see TabBar) — that is the pair to bind.
                onfocusout={commitExcludedDirs}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitExcludedDirs()
                }}
                placeholder="node_modules, .git, dist"
                style={filterStyle()}
              />
            </div>
          </div>
        )}
      </div>

      {/* The failed request, in place of (search) or above (replace) the results summary */}
      {failure() && !loading() && (
        <div data-mol-id="search-error" role="alert" class={cm.textError} style={errorStyle()}>
          {failure() === 'search'
            ? t('ide.search.searchFailed', undefined, { defaultValue: 'Search failed.' })
            : t('ide.search.replaceFailed', undefined, {
                defaultValue: 'Replace failed. The results show what the files contain now.',
              })}
        </div>
      )}

      {/* Results summary */}
      {searched() && !loading() && failure() !== 'search' && (
        <div style={summaryStyle()}>{summaryText()}</div>
      )}

      {loading() && (
        <div style={searchingStyle()}>
          {t('ide.search.searching', undefined, { defaultValue: 'Searching…' })}
        </div>
      )}

      {/* Results list */}
      <div style={listStyle()}>
        {results().map((result) => (
          <FileResultGroup
            result={result}
            onResultClick={props.onResultClick}
            onReplaceInFile={handleReplaceInFile}
            isLight={isLight()}
            showReplace={showReplace()}
          />
        ))}
      </div>
    </div>
  )

  /**
   * The summary line's text (declared after the JSX so the early return above
   * stays the render body; reads its signals directly).
   *
   * @returns The translated summary.
   */
  function summaryText(): string {
    return totalCount() > 0
      ? truncated()
        ? t(
            'ide.search.resultsTruncated',
            { count: totalCount(), files: results().length },
            { defaultValue: '{{count}} results in {{files}} files (truncated)' },
          )
        : t(
            'ide.search.results',
            { count: totalCount(), files: results().length },
            { defaultValue: '{{count}} results in {{files}} files' },
          )
      : t('ide.search.noResults', undefined, { defaultValue: 'No results found' })
  }
}
