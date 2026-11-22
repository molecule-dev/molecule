<!--
  SearchPanel: the Svelte counterpart of `@molecule/app-ide-react`'s
  `SearchPanel` (see that file for the design notes) — the search-in-files
  panel: a debounced grep over the project sandbox, grouped per file, with the
  option toggles (`Aa` / `ab` / `.*`), the include/exclude glob filters, the
  excluded-directories editor the host persists, and a two-click replace strip.
  Same props (React names), same DOM for the same input, same callbacks.

  The inline styles are written as the attribute TEXT React's CSSOM writes
  leave behind (colors in `rgb()`/`rgba()` with spaces, `flex: 1` expanded,
  trailing-equal padding collapsed, `border: none` as `border: medium`).
  Static styles ride the template literal; styles with a dynamic declaration
  are per-property `style:` directives — the framework's one-shot style-text
  parse drops `background: transparent` and `border-image: none` beside
  border longhands (see QuickPicker), and setProperty keeps every value. The
  fields keep their `value` ATTRIBUTE in step with the controlled value the
  way React does. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { getIcon } from 'material-file-icons'
  import { untrack } from 'svelte'

  import type {
    SearchPanelProps,
    SearchResponse,
    SearchResult,
  } from '@molecule/app-ide-panel-logic'
  import { DEFAULT_SEARCH_EXCLUDED_DIRS } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'
  import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import Markup from '../parts/Markup.svelte'

  const logger = getLogger('search')

  /**
   * Applies a style map one property at a time through the CSSOM. Svelte's
   * first render merges a static `style` text and its directives into one
   * string and parses it as `cssText`, which drops `background: transparent`
   * and `border-image: none` beside the border longhands; `setProperty` keeps
   * every value, exactly as React's per-property writes do.
   *
   * @param node - The element the action is attached to.
   * @param styles - The property/value pairs to apply.
   * @returns The action's update function.
   */
  function styleProperties(
    node: HTMLElement,
    styles: Record<string, string>,
  ): { update: (next: Record<string, string>) => void } {
    const apply = (next: Record<string, string>): void => {
      for (const [property, value] of Object.entries(next)) node.style.setProperty(property, value)
    }
    apply(styles)
    return { update: apply }
  }
</script>

<script lang="ts">
  let {
    projectId,
    onResultClick,
    className,
    excludedDirs,
    onExcludedDirsChange,
    readOnly,
  }: SearchPanelProps = $props()

  const { t } = useTranslation()
  const mode = useThemeMode()
  const http = useHttpClient()
  const isNarrowStore = useNarrowViewport()
  const isCoarseStore = useCoarsePointer()

  const isLight = $derived($mode === 'light')
  // iOS Safari zooms the whole page when a focused input's font-size is under
  // 16px — text inputs bump to 16px on phones/touch devices; desktop keeps
  // the compact sizes.
  const inputFontSize = $derived($isNarrowStore || $isCoarseStore ? '16px' : '12px')
  const filterFontSize = $derived($isNarrowStore || $isCoarseStore ? '16px' : '11px')
  // The replace expand toggle (and the spacer that aligns the replace input
  // under the search input) widen together on touch-first devices.
  const replaceToggleWidth = $derived($isCoarseStore ? 36 : 14)
  // The glyph toggle's box: the compact monospace affordance React writes
  // property by property (see `styleProperties`).
  const PRIMARY = 'var(--mol-color-primary, #4070e0)'
  const BORDER = 'var(--color-border, #333)'
  const MUTED_TEXT = 'var(--mol-color-text-secondary, #888)'

  /**
   * The glyph toggle's style map, in React's declaration order.
   *
   * @param active - Whether the option is on.
   * @returns The property/value pairs.
   */
  function toggleStyle(active: boolean): Record<string, string> {
    return {
      background: active
        ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
        : 'transparent',
      'border-color': active ? PRIMARY : BORDER,
      'border-image': 'none',
      'border-radius': '3px',
      'border-style': 'solid',
      'border-width': '1px',
      color: active ? PRIMARY : MUTED_TEXT,
      cursor: 'pointer',
      'font-family': 'monospace',
      'font-size': '11px',
      'line-height': '1',
      padding: '2px 5px',
    }
  }

  /**
   * The replace disclosure toggle's style map (its width is the alignment
   * column the replace input lines up against).
   *
   * @returns The property/value pairs.
   */
  function replaceToggleStyle(): Record<string, string> {
    return {
      background: 'transparent',
      border: 'medium',
      color: MUTED_TEXT,
      cursor: 'pointer',
      'font-size': '10px',
      'line-height': '1',
      padding: '0px',
      'text-align': 'center',
      width: `${replaceToggleWidth}px`,
    }
  }
  // The themed field look, shared by the search, replace and filter inputs
  // (React's `fieldStyle`/`filterStyle` background), pre-serialized the way
  // the CSSOM leaves it.
  const fieldBg = $derived(isLight ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.06)')
  // The amber confirmation strip under the replace input (theme-tinted).
  const confirmBg = $derived(isLight ? 'rgba(200, 120, 0, 0.1)' : 'rgba(200, 120, 0, 0.15)')
  const confirmColor = $derived(isLight ? 'rgb(138, 80, 0)' : 'rgb(224, 160, 48)')

  let query = $state('')
  let caseSensitive = $state(false)
  let useRegex = $state(false)
  let wholeWord = $state(false)
  let includeGlob = $state('')
  let excludeGlob = $state('')
  let showFilters = $state(false)

  // Excluded-dirs editor (VS Code search.exclude): draft text tracks the prop
  // (comma-separated); commit on blur/Enter parses, dedupes, and hands the set
  // to the host to persist — the server applies it to every search surface.
  const effectiveExcluded = $derived(excludedDirs ?? [...DEFAULT_SEARCH_EXCLUDED_DIRS])
  const excludedPropKey = $derived(effectiveExcluded.join(','))
  // A writable derived: it follows the prop, and an edit overrides it until the
  // prop's key changes again (the same reset React's effect performs).
  let excludedDirsDraft = $derived(excludedPropKey.split(',').filter(Boolean).join(', '))

  /**
   * Commits the draft: parses, drops invalid names, dedupes, normalizes the
   * field and hands the set to the host when it changed.
   */
  function commitExcludedDirs(): void {
    const dirs = [
      ...new Set(
        excludedDirsDraft
          .split(',')
          .map((d) => d.trim())
          .filter((d) => /^[A-Za-z0-9._-]+$/.test(d)),
      ),
    ]
    excludedDirsDraft = dirs.join(', ')
    if (dirs.join(',') !== excludedPropKey) onExcludedDirsChange?.(dirs)
  }

  let results = $state<SearchResult[]>([])
  let totalCount = $state(0)
  let truncated = $state(false)
  let loading = $state(false)
  let searched = $state(false)
  // The request that failed last, shown in place of the results summary; a search that succeeds clears it.
  let failure = $state<'search' | 'replace' | null>(null)

  // Replace state
  let showReplace = $state(false)
  let replacement = $state('')
  let replacing = $state(false)
  let confirmAll = $state(false)

  // A result group's collapsed state, keyed by file — React keeps it in each
  // keyed group component, and unmounting a group (a re-search that dropped
  // the file) forgets it, so entries for files no longer listed are pruned.
  let collapsedFiles = $state<Record<string, boolean>>({})
  $effect(() => {
    const files = new Set(results.map((result) => result.file))
    for (const key of Object.keys(collapsedFiles)) {
      if (!files.has(key)) delete collapsedFiles[key]
    }
  })

  let abortRef: AbortController | undefined
  let queryEl = $state<HTMLInputElement | null>(null)
  let replaceEl = $state<HTMLInputElement | null>(null)
  let includeEl = $state<HTMLInputElement | null>(null)
  let excludeEl = $state<HTMLInputElement | null>(null)
  let excludedEl = $state<HTMLInputElement | null>(null)

  // Focus the search input on mount (the element binds once, so this runs once).
  $effect(() => {
    queryEl?.focus()
  })

  // React keeps the controlled fields' `value` ATTRIBUTE in step with the
  // controlled value (Svelte's `value={…}` sets only the property; the
  // serialized markup carries both).
  $effect(() => {
    queryEl?.setAttribute('value', query)
  })
  $effect(() => {
    replaceEl?.setAttribute('value', replacement)
  })
  $effect(() => {
    includeEl?.setAttribute('value', includeGlob)
  })
  $effect(() => {
    excludeEl?.setAttribute('value', excludeGlob)
  })
  $effect(() => {
    excludedEl?.setAttribute('value', excludedDirsDraft)
  })

  /**
   * Runs the search for `pattern` (React's `doSearch`): aborts the previous
   * in-flight request, resets on a blank pattern, and applies the reply —
   * unless a later search superseded it. Untracked: its callers are effects,
   * and its state reads are inputs, not dependencies.
   *
   * @param pattern - The raw query text.
   * @returns Settles once the reply is applied, so a replace can wait for its re-search.
   */
  function doSearch(pattern: string): Promise<void> {
    return untrack(() => {
      if (!pattern.trim()) {
        results = []
        totalCount = 0
        truncated = false
        searched = false
        failure = null
        return Promise.resolve()
      }

      // Abort previous in-flight search
      abortRef?.abort()
      const controller = new AbortController()
      abortRef = controller

      loading = true
      const params = new URLSearchParams({ pattern })
      if (caseSensitive) params.set('caseSensitive', '1')
      if (useRegex) params.set('regex', '1')
      if (wholeWord) params.set('wholeWord', '1')
      if (includeGlob.trim()) params.set('include', includeGlob.trim())
      if (excludeGlob.trim()) params.set('exclude', excludeGlob.trim())

      return http
        .get<SearchResponse>(`/projects/${projectId}/search?${params.toString()}`)
        .then((res) => {
          if (controller.signal.aborted) return
          results = res.data.results
          totalCount = res.data.totalCount
          truncated = res.data.truncated
          searched = true
          failure = null
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            logger.warn('Search request failed', { error })
            results = []
            totalCount = 0
            searched = true
            failure = 'search'
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) loading = false
        })
    })
  }

  // Debounced search on query change (React's effect on `[query, doSearch]`;
  // `doSearch` moves whenever the request options below move).
  $effect(() => {
    void query
    void projectId
    void caseSensitive
    void useRegex
    void wholeWord
    void includeGlob
    void excludeGlob
    const id = setTimeout(() => {
      void doSearch(query)
    }, 300)
    return () => {
      clearTimeout(id)
    }
  })

  // Re-search immediately when the toggle options change (if we have a query)
  $effect(() => {
    void caseSensitive
    void useRegex
    void wholeWord
    void includeGlob
    void excludeGlob
    untrack(() => {
      if (query.trim()) void doSearch(query)
    })
  })

  /**
   * Posts the bulk replace, then re-searches to update the results (React's
   * `doReplace`). A failed replace is logged and still re-searches, since it
   * may have changed some files first, and then shows the replace failure.
   *
   * @param targetFiles - The files to replace in (all when omitted).
   */
  async function doReplace(targetFiles?: string[]): Promise<void> {
    if (!query.trim()) return
    replacing = true
    let replaceFailed = false
    try {
      await http.post(`/projects/${projectId}/replace`, {
        pattern: query,
        replacement,
        files: targetFiles,
        caseSensitive,
        regex: useRegex,
        wholeWord,
      })
    } catch (error) {
      logger.warn('Replace request failed', { error, files: targetFiles })
      replaceFailed = true
    }
    try {
      // Re-search to update results (doSearch handles its own failure)
      await doSearch(query)
      // Unless the re-search failed too: the results then show nothing, and the search failure says so.
      if (replaceFailed && failure !== 'search') failure = 'replace'
    } finally {
      replacing = false
      confirmAll = false
    }
  }

  /** The two-click confirm, then the replace (React's `handleReplaceAll`). */
  function handleReplaceAll(): void {
    if (confirmAll) {
      void doReplace()
    } else {
      confirmAll = true
    }
  }

  /**
   * Replaces within one file (React's `handleReplaceInFile`).
   *
   * @param file - The file's path.
   */
  function handleReplaceInFile(file: string): void {
    void doReplace([file])
  }

  const cm = $derived(getClassMap())
  const fileCount = $derived(results.length)
</script>

<div
  class={cm.cn(className) || undefined}
  style="display: flex; flex-direction: column; height: 100%"
>
  <!-- Search input row -->
  <div style="padding: 8px 8px 4px">
    <div style="align-items: center; display: flex; gap: 4px">
      <!-- Replace expand toggle — hidden in read-only mode (bulk writes are
           editor work) -->
      {#if !readOnly}
        <button
          type="button"
          data-mol-id="search-replace-toggle"
          aria-expanded={showReplace ? 'true' : 'false'}
          onclick={() => {
            showReplace = !showReplace
            confirmAll = false
          }}
          title={t('ide.search.toggleReplace', undefined, { defaultValue: 'Toggle Replace' })}
          class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
          use:styleProperties={replaceToggleStyle()}
        >
          {showReplace ? '▼' : '▶'}
        </button>
      {/if}
      <input
        bind:this={queryEl}
        type="text"
        value={query}
        oninput={(event) => {
          query = event.currentTarget.value
        }}
        placeholder={t('ide.search.placeholder', undefined, { defaultValue: 'Search' })}
        style:background={fieldBg}
        style:border-radius="3px"
        style:border="1px solid var(--color-border, #333)"
        style:color="var(--mol-color-text, currentColor)"
        style:flex="1 1 0%"
        style:font-size={inputFontSize}
        style:min-width="0px"
        style:outline="none"
        style:padding="4px 6px"
      />
      {#if query}
        <button
          type="button"
          data-mol-id="search-clear"
          onclick={() => (query = '')}
          title={t('ide.search.clear', undefined, { defaultValue: 'Clear' })}
          aria-label={t('ide.search.clear', undefined, { defaultValue: 'Clear' })}
          class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
          style="background: transparent; border: medium; color: var(--mol-color-text-secondary, #888); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 4px"
        >
          ×
        </button>
      {/if}
    </div>

    <!-- Replace input -->
    {#if !readOnly && showReplace}
      <div style="align-items: center; display: flex; gap: 4px; margin-top: 4px">
        <!-- Spacer to align with the search input (same width as the toggle arrow) -->
        <div style:flex-shrink="0" style:width={`${replaceToggleWidth}px`}></div>
        <input
          bind:this={replaceEl}
          type="text"
          value={replacement}
          oninput={(event) => {
            replacement = event.currentTarget.value
            confirmAll = false
          }}
          placeholder={t('ide.search.replacePlaceholder', undefined, { defaultValue: 'Replace' })}
          style:background={fieldBg}
          style:border-radius="3px"
          style:border="1px solid var(--color-border, #333)"
          style:color="var(--mol-color-text, currentColor)"
          style:flex="1 1 0%"
          style:font-size={inputFontSize}
          style:min-width="0px"
          style:outline="none"
          style:padding="4px 6px"
        />
        <button
          type="button"
          data-mol-id="search-replace-all"
          onclick={handleReplaceAll}
          disabled={!query.trim() || replacing}
          title={confirmAll
            ? t('ide.search.confirmReplaceAll', undefined, {
                defaultValue: 'Click again to confirm',
              })
            : t('ide.search.replaceAll', undefined, { defaultValue: 'Replace All' })}
          class={cm.cn(
            cm.button({ variant: 'solid', color: confirmAll ? 'warning' : 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {replacing
            ? '…'
            : confirmAll
              ? t('ide.search.confirm', undefined, { defaultValue: 'Confirm' })
              : t('ide.search.replaceAllShort', undefined, { defaultValue: 'All' })}
        </button>
      </div>
    {/if}

    <!-- Replace summary -->
    {#if !readOnly && showReplace && confirmAll && totalCount > 0}
      <div
        style:background={confirmBg}
        style:border-radius="3px"
        style:color={confirmColor}
        style:font-size="11px"
        style:margin-left={`${replaceToggleWidth + 4}px`}
        style:margin-top="4px"
        style:padding="3px 6px"
      >
        {t(
          'ide.search.replaceConfirmation',
          { count: totalCount, files: fileCount },
          { defaultValue: 'Replace {{count}} occurrences in {{files}} files?' },
        )}
      </div>
    {/if}

    <!-- Toggle buttons -->
    <div style="align-items: center; display: flex; gap: 4px; margin-top: 4px">
      {#each [{ molId: 'search-toggle-case', glyph: 'Aa', active: caseSensitive, toggle: 'caseSensitive', title: 'ide.search.caseSensitive', fallback: 'Match Case' }, { molId: 'search-toggle-whole-word', glyph: 'ab', active: wholeWord, toggle: 'wholeWord', title: 'ide.search.wholeWord', fallback: 'Match Whole Word' }, { molId: 'search-toggle-regex', glyph: '.*', active: useRegex, toggle: 'useRegex', title: 'ide.search.regex', fallback: 'Use Regular Expression' }, { molId: 'search-toggle-filters', glyph: '⋯', active: showFilters, toggle: 'showFilters', title: 'ide.search.toggleFilters', fallback: 'Toggle Filters' }] as toggle (toggle.molId)}
        {#if toggle.molId === 'search-toggle-filters'}
          <!-- The filters toggle sits at the strip's right edge. -->
          <div style="flex: 1 1 0%"></div>
        {/if}
        <button
          type="button"
          title={t(toggle.title, undefined, { defaultValue: toggle.fallback })}
          aria-label={t(toggle.title, undefined, { defaultValue: toggle.fallback })}
          aria-pressed={toggle.active ? 'true' : 'false'}
          data-mol-id={toggle.molId}
          onclick={() => {
            // The glyph (`Aa`, `ab`, `.*`, `⋯`) is NOT the name: a screen
            // reader announces the translated title, never the glyph.
            switch (toggle.toggle) {
              case 'caseSensitive':
                caseSensitive = !caseSensitive
                break
              case 'wholeWord':
                wholeWord = !wholeWord
                break
              case 'useRegex':
                useRegex = !useRegex
                break
              case 'showFilters':
                showFilters = !showFilters
                break
            }
          }}
          class={cm.touchTargetCompact}
          use:styleProperties={toggleStyle(toggle.active)}
        >
          <span aria-hidden="true">{toggle.glyph}</span>
        </button>
      {/each}
    </div>

    <!-- Include/Exclude filters -->
    {#if showFilters}
      <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px">
        <input
          bind:this={includeEl}
          type="text"
          value={includeGlob}
          oninput={(event) => {
            includeGlob = event.currentTarget.value
          }}
          placeholder={t('ide.search.includeFiles', undefined, {
            defaultValue: 'Files to include (e.g. *.ts)',
          })}
          style:background={fieldBg}
          style:border="1px solid var(--color-border, #333)"
          style:border-radius="3px"
          style:color="var(--mol-color-text, currentColor)"
          style:font-size={filterFontSize}
          style:outline="none"
          style:padding="3px 6px"
        />
        <input
          bind:this={excludeEl}
          type="text"
          value={excludeGlob}
          oninput={(event) => {
            excludeGlob = event.currentTarget.value
          }}
          placeholder={t('ide.search.excludeFiles', undefined, {
            defaultValue: 'Files to exclude (e.g. *.min.js)',
          })}
          style:background={fieldBg}
          style:border="1px solid var(--color-border, #333)"
          style:border-radius="3px"
          style:color="var(--mol-color-text, currentColor)"
          style:font-size={filterFontSize}
          style:outline="none"
          style:padding="3px 6px"
        />
        <!-- Excluded directories (VS Code search.exclude) — the project-wide
             set the SERVER applies to every search surface (this panel AND the
             AI agent's search tools). Edited here, persisted by the host via
             onExcludedDirsChange; searches never send it per query. The
             placeholder is an EXAMPLE of the input (directory names) — the
             same in every language, never a sentence to translate — and
             read-only viewers can see the set but not edit it (their edits
             would never persist; the host omits onExcludedDirsChange). -->
        <div style="display: flex; flex-direction: column; gap: 2px">
          <label
            for="mol-search-excluded-dirs"
            style="color: var(--mol-color-text-secondary, #888); font-size: 10px"
          >
            {t('ide.search.excludedDirs', undefined, {
              defaultValue: 'Excluded folders (applies to all searches, including the agent)',
            })}
          </label>
          <!-- React's synthetic onBlur derives from the bubbling `focusout`
               (see TabBar) — that is the pair to bind. -->
          <input
            bind:this={excludedEl}
            id="mol-search-excluded-dirs"
            type="text"
            data-mol-id="search-excluded-dirs"
            translate="no"
            value={excludedDirsDraft}
            readonly={readOnly === true}
            oninput={(event) => {
              excludedDirsDraft = event.currentTarget.value
            }}
            onfocusout={() => commitExcludedDirs()}
            onkeydown={(event) => {
              if (event.key === 'Enter') commitExcludedDirs()
            }}
            placeholder="node_modules, .git, dist"
            style:background={fieldBg}
            style:border="1px solid var(--color-border, #333)"
            style:border-radius="3px"
            style:color="var(--mol-color-text, currentColor)"
            style:font-size={filterFontSize}
            style:outline="none"
            style:padding="3px 6px"
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- The failed request, in place of (search) or above (replace) the results summary -->
  {#if failure && !loading}
    <div
      data-mol-id="search-error"
      role="alert"
      class={cm.textError}
      style="font-size: 11px; padding: 2px 8px 4px"
    >
      {failure === 'search'
        ? t('ide.search.searchFailed', undefined, { defaultValue: 'Search failed.' })
        : t('ide.search.replaceFailed', undefined, {
            defaultValue: 'Replace failed. The results show what the files contain now.',
          })}
    </div>
  {/if}

  <!-- Results summary -->
  {#if searched && !loading && failure !== 'search'}
    <div
      style="color: var(--mol-color-text-secondary, #888); font-size: 11px; padding: 2px 8px 4px"
    >
      {totalCount > 0
        ? truncated
          ? t(
              'ide.search.resultsTruncated',
              { count: totalCount, files: fileCount },
              { defaultValue: '{{count}} results in {{files}} files (truncated)' },
            )
          : t(
              'ide.search.results',
              { count: totalCount, files: fileCount },
              { defaultValue: '{{count}} results in {{files}} files' },
            )
        : t('ide.search.noResults', undefined, { defaultValue: 'No results found' })}
    </div>
  {/if}

  {#if loading}
    <div style="color: var(--mol-color-text-secondary, #888); font-size: 11px; padding: 2px 8px">
      {t('ide.search.searching', undefined, { defaultValue: 'Searching…' })}
    </div>
  {/if}

  <!-- Results list -->
  <div style="flex: 1 1 0%; min-height: 0px; overflow: auto">
    {#each results as result (result.file)}
      {@const collapsed = collapsedFiles[result.file] ?? false}
      <div style="margin-bottom: 2px">
        <div
          style:align-items="center"
          style:background={isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)'}
          style:display="flex"
        >
          <button
            type="button"
            data-mol-id="search-file-toggle"
            aria-expanded={collapsed ? 'false' : 'true'}
            onclick={() => {
              collapsedFiles[result.file] = !collapsed
            }}
            class={cm.touchTargetCompact}
            style="align-items: center; background: transparent; border: medium; color: var(--mol-color-text, currentColor); cursor: pointer; display: flex; flex: 1 1 0%; font-size: 12px; gap: 4px; min-width: 0px; padding: 3px 8px; text-align: left"
          >
            <span style="flex-shrink: 0; font-size: 10px; text-align: center; width: 12px">
              {collapsed ? '▶' : '▼'}
            </span>
            <span style="display: inline-flex; flex-shrink: 0; height: 16px; width: 16px"
              ><Markup markup={getIcon(result.file.split('/').pop() ?? result.file).svg} /></span
            >
            <span
              style="flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
            >
              {result.file}
            </span>
            <span
              style:background={isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'}
              style:border-radius="8px"
              style:flex-shrink="0"
              style:font-size="10px"
              style:padding="1px 5px"
            >
              {result.matches.length}
            </span>
          </button>
          {#if showReplace}
            <button
              type="button"
              data-mol-id="search-replace-in-file"
              onclick={() => handleReplaceInFile(result.file)}
              title={t('ide.search.replaceInFile', undefined, {
                defaultValue: 'Replace in this file',
              })}
              class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
              style="background: transparent; border: medium; color: var(--mol-color-text-secondary, #888); cursor: pointer; font-size: 11px; margin-right: 4px; padding: 2px 6px"
            >
              ↻
            </button>
          {/if}
        </div>
        {#if !collapsed}
          {#each result.matches as match (`${result.file}:${match.line}`)}
            <button
              type="button"
              data-mol-id="search-match"
              onclick={() => onResultClick?.(result.file, match.line)}
              class={cm.touchTargetCompact}
              style="align-items: center; background: transparent; border: medium; color: var(--mol-color-text, currentColor); cursor: pointer; display: flex; font-family: monospace; font-size: 12px; gap: 6px; padding: 2px 8px 2px 32px; text-align: left; width: 100%"
              onmouseenter={(event) => {
                event.currentTarget.style.background = isLight
                  ? 'rgba(0, 0, 0, 0.06)'
                  : 'rgba(255, 255, 255, 0.06)'
              }}
              onmouseleave={(event) => {
                event.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style="color: var(--mol-color-text-secondary, #888); flex-shrink: 0; min-width: 30px; text-align: right"
              >
                {match.line}
              </span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                {match.content}
              </span>
            </button>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
</div>
