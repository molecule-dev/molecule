/**
 * Search-in-files panel — provides grep-like search and replace across the
 * project sandbox.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `SearchPanel` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. The query is debounced (300 ms) into a
 * `GET /projects/:id/search` whose reply groups the matches per file; the
 * option toggles (`Aa` / `ab` / `.*`) re-search at once, the glob filters ride
 * the same request, and the excluded-directories editor commits a trimmed,
 * deduped set on blur or Enter for the host to persist. The replace strip
 * confirms with a second click, posts the bulk replace and re-searches.
 *
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import type { SearchResponse, SearchResult } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SEARCH_EXCLUDED_DIRS } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-vue'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

const logger = getLogger('search')

/**
 * Extract the filename from a full path for the file icon.
 * @param path - Full file path.
 * @returns The filename portion.
 */
function basename(path: string): string {
  return path.split('/').pop() ?? path
}

/**
 * The file-type icon: the material-file-icons SVG injected into a fixed-size
 * span, the way React's `FileTypeIcon` renders it.
 *
 * @param name - The file's bare name.
 * @returns The icon span.
 */
function fileTypeIcon(name: string): VNode {
  return h('span', {
    style: { display: 'inline-flex', flexShrink: '0', width: '16px', height: '16px' },
    innerHTML: getIcon(name).svg,
  })
}

/**
 * Mirrors React onto a controlled field: React keeps the `value` ATTRIBUTE in
 * step with the controlled value (the DOM property alone is not enough for
 * the same serialized markup).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * The glyph toggle for a search option (match case, whole word, regex,
 * filters). Deliberately NOT a `cm.button()` CTA — see React's file. The
 * translated `title` is the accessible name; the glyph itself is decorative.
 */
const ToggleButton = defineComponent({
  name: 'ToggleButton',
  props: {
    /** Whether the option is on. */
    active: { type: Boolean, required: true },
    /** Called when the toggle is clicked. */
    onClick: { type: Function as PropType<() => void>, required: true },
    /** The translated label (the title and the accessible name). */
    title: { type: String, required: true },
    /** Stable id for agents/tests. */
    molId: { type: String, required: true },
    /** The decorative glyph (`Aa`, `ab`, `.*`, `⋯`). */
    glyph: { type: String, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    return (): VNodeChild =>
      h(
        'button',
        {
          type: 'button',
          title: props.title,
          // The glyph (`Aa`, `ab`, `.*`, `⋯`) is NOT the name: the translated
          // `title` is the accessible name; the glyph itself is decorative.
          'aria-label': props.title,
          'aria-pressed': props.active ? 'true' : 'false',
          'data-mol-id': props.molId,
          onClick: props.onClick,
          class: cm.touchTargetCompact,
          style: {
            padding: '2px 5px',
            fontSize: '11px',
            fontFamily: 'monospace',
            border: '1px solid',
            borderColor: props.active
              ? 'var(--mol-color-primary, #4070e0)'
              : 'var(--color-border, #333)',
            borderRadius: '3px',
            background: props.active
              ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
              : 'transparent',
            color: props.active
              ? 'var(--mol-color-primary, #4070e0)'
              : 'var(--mol-color-text-secondary, #888)',
            cursor: 'pointer',
            lineHeight: '1',
          },
        },
        [h('span', { 'aria-hidden': 'true' }, props.glyph)],
      )
  },
})

/**
 * The replace strip's action button — a real design-system CTA (see React's
 * file).
 */
const ActionButton = defineComponent({
  name: 'ActionButton',
  props: {
    /** Called when the button is clicked. */
    onClick: { type: Function as PropType<() => void>, required: true },
    /** The translated tooltip. */
    title: { type: String, required: true },
    /** Stable id for agents/tests. */
    molId: { type: String, required: true },
    /** Semantic CTA colour (DESIGN.md → CTA color semantics). */
    color: { type: String as PropType<ColorVariant>, required: true },
    /** The label text. */
    label: { type: String, required: true },
    /** Whether the action is unavailable. */
    disabled: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const cm = getClassMap()
    return (): VNodeChild =>
      h(
        'button',
        {
          type: 'button',
          title: props.title,
          'data-mol-id': props.molId,
          onClick: props.onClick,
          disabled: props.disabled || undefined,
          class: cm.cn(
            cm.button({ variant: 'solid', color: props.color, size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          ),
        },
        props.label,
      )
  },
})

/**
 * Collapsible result group for a single file (React's internal
 * `FileResultGroup`).
 */
const FileResultGroup = defineComponent({
  name: 'FileResultGroup',
  props: {
    /** The file's grouped matches. */
    result: { type: Object as PropType<SearchResult>, required: true },
    /** Opens the file at a line. */
    onResultClick: {
      type: Function as PropType<(path: string, line: number) => void>,
      required: false,
      default: undefined,
    },
    /** Replaces within this file. */
    onReplaceInFile: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Whether the light theme tints the row. */
    isLight: { type: Boolean, required: true },
    /** Whether the replace strip is open. */
    showReplace: { type: Boolean, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const collapsed = ref(false)

    return (): VNodeChild =>
      h('div', { style: { marginBottom: '2px' } }, [
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              background: props.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
            },
          },
          [
            h(
              'button',
              {
                type: 'button',
                'data-mol-id': 'search-file-toggle',
                'aria-expanded': collapsed.value ? 'false' : 'true',
                onClick: () => {
                  collapsed.value = !collapsed.value
                },
                class: cm.touchTargetCompact,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flex: '1',
                  padding: '3px 8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--mol-color-text, currentColor)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textAlign: 'left',
                  // The row must be allowed to shrink below its content for the
                  // path to ellipsize; the min-HEIGHT half of the class — the
                  // part that matters for a tap target — stays.
                  minWidth: '0',
                },
              },
              [
                h(
                  'span',
                  {
                    style: {
                      fontSize: '10px',
                      width: '12px',
                      textAlign: 'center',
                      flexShrink: '0',
                    },
                  },
                  collapsed.value ? '▶' : '▼',
                ),
                fileTypeIcon(basename(props.result.file)),
                h(
                  'span',
                  {
                    style: {
                      flex: '1',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  props.result.file,
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '8px',
                      background: props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                      flexShrink: '0',
                    },
                  },
                  String(props.result.matches.length),
                ),
              ],
            ),
            props.showReplace && props.onReplaceInFile
              ? h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'search-replace-in-file',
                    onClick: () => props.onReplaceInFile?.(props.result.file),
                    title: t('ide.search.replaceInFile', undefined, {
                      defaultValue: 'Replace in this file',
                    }),
                    class: cm.cn(cm.touchTargetCompact, cm.shrink0),
                    style: {
                      padding: '2px 6px',
                      marginRight: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--mol-color-text-secondary, #888)',
                      cursor: 'pointer',
                      fontSize: '11px',
                    },
                  },
                  '↻',
                )
              : null,
          ],
        ),
        ...(collapsed.value
          ? []
          : props.result.matches.map((match) =>
              h(
                'button',
                {
                  key: `${props.result.file}:${match.line}`,
                  type: 'button',
                  'data-mol-id': 'search-match',
                  onClick: () => props.onResultClick?.(props.result.file, match.line),
                  class: cm.touchTargetCompact,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '2px 8px 2px 32px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--mol-color-text, currentColor)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                  },
                  onMouseenter: (e: MouseEvent) => {
                    ;(e.currentTarget as HTMLElement).style.background = props.isLight
                      ? 'rgba(0,0,0,0.06)'
                      : 'rgba(255,255,255,0.06)'
                  },
                  onMouseleave: (e: MouseEvent) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  },
                },
                [
                  h(
                    'span',
                    {
                      style: {
                        color: 'var(--mol-color-text-secondary, #888)',
                        flexShrink: '0',
                        minWidth: '30px',
                        textAlign: 'right',
                      },
                    },
                    String(match.line),
                  ),
                  h(
                    'span',
                    {
                      style: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    },
                    match.content,
                  ),
                ],
              ),
            )),
      ])
  },
})

/**
 * Search-in-files panel for the IDE sidebar with find-and-replace support.
 *
 * @param props - The React prop names, `SearchPanelProps` in
 *   `@molecule/app-ide-panel-logic`.
 * @returns The rendered search panel.
 */
export const SearchPanel = defineComponent({
  name: 'SearchPanel',
  props: {
    /** Project ID used for API calls. */
    projectId: { type: String, required: true },
    /** Called when the user clicks a search result. */
    onResultClick: {
      type: Function as PropType<(path: string, line: number) => void>,
      required: false,
      default: undefined,
    },
    /** Extra classes for the root. */
    className: { type: String, required: false, default: undefined },
    /** The project's excluded directory names (VS Code `search.exclude`). */
    excludedDirs: { type: Array as PropType<string[]>, required: false, default: undefined },
    /** Persist an edited excluded-dir set (the host owns storage). */
    onExcludedDirsChange: {
      type: Function as PropType<(dirs: string[]) => void>,
      required: false,
      default: undefined,
    },
    /** Read-only mode (a project viewer): the replace strip is hidden. */
    readOnly: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const mode = useThemeMode()
    const isLight = computed(() => mode.value === 'light')
    const http = useHttpClient()
    const isNarrow = useNarrowViewport()
    const isCoarse = useCoarsePointer()
    // iOS Safari zooms the whole page when a focused input's font-size is under
    // 16px — text inputs bump to 16px on phones/touch devices.
    const inputFontSize = computed(() => (isNarrow.value || isCoarse.value ? '16px' : '12px'))
    const filterFontSize = computed(() => (isNarrow.value || isCoarse.value ? '16px' : '11px'))
    // The replace expand toggle (and the spacer that aligns the replace input
    // under the search input) widen together on touch-first devices.
    const replaceToggleWidth = computed(() => (isCoarse.value ? 36 : 14))

    const query = ref('')
    const caseSensitive = ref(false)
    const useRegex = ref(false)
    const wholeWord = ref(false)
    const includeGlob = ref('')
    const excludeGlob = ref('')
    const showFilters = ref(false)

    // Excluded-dirs editor (VS Code search.exclude): draft text tracks the
    // prop (comma-separated); commit on blur/Enter parses, dedupes, and hands
    // the set to the host to persist.
    const effectiveExcluded = computed(
      () => props.excludedDirs ?? [...DEFAULT_SEARCH_EXCLUDED_DIRS],
    )
    const excludedDirsDraft = ref(effectiveExcluded.value.join(', '))
    const excludedPropKey = computed(() => effectiveExcluded.value.join(','))
    watch(
      excludedPropKey,
      (key) => {
        excludedDirsDraft.value = key.split(',').filter(Boolean).join(', ')
      },
      { immediate: true },
    )

    /**
     * Commits the draft: parses, drops invalid names, dedupes, normalizes the
     * field and hands the set to the host when it changed.
     */
    const commitExcludedDirs = (): void => {
      const dirs = [
        ...new Set(
          excludedDirsDraft.value
            .split(',')
            .map((d) => d.trim())
            .filter((d) => /^[A-Za-z0-9._-]+$/.test(d)),
        ),
      ]
      excludedDirsDraft.value = dirs.join(', ')
      if (dirs.join(',') !== excludedPropKey.value) props.onExcludedDirsChange?.(dirs)
    }

    const results = ref<SearchResult[]>([])
    const totalCount = ref(0)
    const truncated = ref(false)
    const loading = ref(false)
    const searched = ref(false)
    // The request that failed last, shown in place of the results summary; a search that succeeds clears it.
    const failure = ref<'search' | 'replace' | null>(null)

    // Replace state
    const showReplace = ref(false)
    const replacement = ref('')
    const replacing = ref(false)
    const confirmAll = ref(false)

    let debounceId: ReturnType<typeof setTimeout> | undefined
    let abortRef: AbortController | undefined
    const inputRef = ref<HTMLInputElement | null>(null)

    // Focus the search input on mount
    onMounted(() => {
      inputRef.value?.focus()
    })

    /**
     * Runs the search for `pattern` (React's `doSearch`): aborts the previous
     * in-flight request, resets on a blank pattern, and applies the reply —
     * unless a later search superseded it.
     *
     * @param pattern - The raw query text.
     */
    const doSearch = async (pattern: string): Promise<void> => {
      if (!pattern.trim()) {
        results.value = []
        totalCount.value = 0
        truncated.value = false
        searched.value = false
        failure.value = null
        return
      }

      // Abort previous in-flight search
      abortRef?.abort()
      const controller = new AbortController()
      abortRef = controller

      loading.value = true
      try {
        const params = new URLSearchParams({ pattern })
        if (caseSensitive.value) params.set('caseSensitive', '1')
        if (useRegex.value) params.set('regex', '1')
        if (wholeWord.value) params.set('wholeWord', '1')
        if (includeGlob.value.trim()) params.set('include', includeGlob.value.trim())
        if (excludeGlob.value.trim()) params.set('exclude', excludeGlob.value.trim())

        const res = await http.get<SearchResponse>(
          `/projects/${props.projectId}/search?${params.toString()}`,
        )
        if (controller.signal.aborted) return
        results.value = res.data.results
        totalCount.value = res.data.totalCount
        truncated.value = res.data.truncated
        searched.value = true
        failure.value = null
      } catch (error) {
        if (!controller.signal.aborted) {
          logger.warn('Search request failed', { error })
          results.value = []
          totalCount.value = 0
          searched.value = true
          failure.value = 'search'
        }
      } finally {
        if (!controller.signal.aborted) loading.value = false
      }
    }

    // Debounced search on query change (React's effect on `[query, doSearch]`;
    // `doSearch` moves whenever the request options below move).
    watch(
      [query, () => props.projectId, caseSensitive, useRegex, wholeWord, includeGlob, excludeGlob],
      () => {
        if (debounceId !== undefined) clearTimeout(debounceId)
        debounceId = setTimeout(() => {
          void doSearch(query.value)
        }, 300)
      },
      { immediate: true },
    )

    // Re-search immediately when the toggle options change (if we have a query)
    watch([caseSensitive, useRegex, wholeWord, includeGlob, excludeGlob], () => {
      if (query.value.trim()) void doSearch(query.value)
    })

    onBeforeUnmount(() => {
      if (debounceId !== undefined) clearTimeout(debounceId)
    })

    /**
     * Posts the bulk replace, then re-searches to update the results (React's
     * `doReplace`). A failed replace is logged and still re-searches, since it
     * may have changed some files first, and then shows the replace failure.
     *
     * @param targetFiles - The files to replace in (all when omitted).
     */
    const doReplace = async (targetFiles?: string[]): Promise<void> => {
      if (!query.value.trim()) return
      replacing.value = true
      let replaceFailed = false
      try {
        await http.post(`/projects/${props.projectId}/replace`, {
          pattern: query.value,
          replacement: replacement.value,
          files: targetFiles,
          caseSensitive: caseSensitive.value,
          regex: useRegex.value,
          wholeWord: wholeWord.value,
        })
      } catch (error) {
        logger.warn('Replace request failed', { error, files: targetFiles })
        replaceFailed = true
      }
      try {
        // Re-search to update results (doSearch handles its own failure)
        await doSearch(query.value)
        // Unless the re-search failed too: the results then show nothing, and the search failure says so.
        if (replaceFailed && failure.value !== 'search') failure.value = 'replace'
      } finally {
        replacing.value = false
        confirmAll.value = false
      }
    }

    /** The two-click confirm, then the replace (React's `handleReplaceAll`). */
    const handleReplaceAll = (): void => {
      if (confirmAll.value) {
        void doReplace()
      } else {
        confirmAll.value = true
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

    const fieldStyle = (): Record<string, string> => ({
      flex: '1',
      padding: '4px 6px',
      fontSize: inputFontSize.value,
      border: '1px solid var(--color-border, #333)',
      borderRadius: '3px',
      background: isLight.value ? '#fff' : 'rgba(255,255,255,0.06)',
      color: 'var(--mol-color-text, currentColor)',
      outline: 'none',
      minWidth: '0',
    })

    const filterStyle = (): Record<string, string> => ({
      padding: '3px 6px',
      fontSize: filterFontSize.value,
      border: '1px solid var(--color-border, #333)',
      borderRadius: '3px',
      background: isLight.value ? '#fff' : 'rgba(255,255,255,0.06)',
      color: 'var(--mol-color-text, currentColor)',
      outline: 'none',
    })

    return (): VNodeChild => {
      const fileCount = results.value.length
      const width = `${replaceToggleWidth.value}px`
      return h(
        'div',
        {
          class: cm.cn(props.className),
          style: { display: 'flex', flexDirection: 'column', height: '100%' },
        },
        [
          // Search input row
          h('div', { style: { padding: '8px 8px 4px 8px' } }, [
            h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, [
              // Replace expand toggle — hidden in read-only mode
              !props.readOnly
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'search-replace-toggle',
                      'aria-expanded': showReplace.value ? 'true' : 'false',
                      onClick: () => {
                        showReplace.value = !showReplace.value
                        confirmAll.value = false
                      },
                      title: t('ide.search.toggleReplace', undefined, {
                        defaultValue: 'Toggle Replace',
                      }),
                      class: cm.cn(cm.touchTargetCompact, cm.shrink0),
                      style: {
                        padding: '0',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--mol-color-text-secondary, #888)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        lineHeight: '1',
                        // The chevron column's width is what the replace input
                        // aligns against.
                        width,
                        textAlign: 'center',
                      },
                    },
                    showReplace.value ? '▼' : '▶',
                  )
                : null,
              h('input', {
                ref: inputRef,
                type: 'text',
                value: query.value,
                onInput: (e: Event) => {
                  query.value = (e.target as HTMLInputElement).value
                },
                placeholder: t('ide.search.placeholder', undefined, { defaultValue: 'Search' }),
                style: fieldStyle(),
                onVnodeMounted: syncValueAttr,
                onVnodeUpdated: syncValueAttr,
              }),
              query.value
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'search-clear',
                      onClick: () => {
                        query.value = ''
                      },
                      title: t('ide.search.clear', undefined, { defaultValue: 'Clear' }),
                      'aria-label': t('ide.search.clear', undefined, { defaultValue: 'Clear' }),
                      class: cm.cn(cm.touchTargetCompact, cm.shrink0),
                      style: {
                        padding: '2px 4px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--mol-color-text-secondary, #888)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: '1',
                      },
                    },
                    '×',
                  )
                : null,
            ]),

            // Replace input
            !props.readOnly && showReplace.value
              ? h(
                  'div',
                  {
                    style: { display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' },
                  },
                  [
                    // Spacer to align with the search input (same width as the toggle arrow)
                    h('div', { style: { width, flexShrink: '0' } }),
                    h('input', {
                      type: 'text',
                      value: replacement.value,
                      onInput: (e: Event) => {
                        replacement.value = (e.target as HTMLInputElement).value
                        confirmAll.value = false
                      },
                      placeholder: t('ide.search.replacePlaceholder', undefined, {
                        defaultValue: 'Replace',
                      }),
                      style: fieldStyle(),
                      onVnodeMounted: syncValueAttr,
                      onVnodeUpdated: syncValueAttr,
                    }),
                    h(ActionButton, {
                      onClick: handleReplaceAll,
                      title: confirmAll.value
                        ? t('ide.search.confirmReplaceAll', undefined, {
                            defaultValue: 'Click again to confirm',
                          })
                        : t('ide.search.replaceAll', undefined, { defaultValue: 'Replace All' }),
                      molId: 'search-replace-all',
                      // Amber while it waits for the second click — the same
                      // warning semantic the confirmation strip below it uses.
                      color: confirmAll.value ? 'warning' : 'primary',
                      disabled: !query.value.trim() || replacing.value,
                      label: replacing.value
                        ? '…'
                        : confirmAll.value
                          ? t('ide.search.confirm', undefined, { defaultValue: 'Confirm' })
                          : t('ide.search.replaceAllShort', undefined, { defaultValue: 'All' }),
                    }),
                  ],
                )
              : null,

            // Replace summary
            !props.readOnly && showReplace.value && confirmAll.value && totalCount.value > 0
              ? h(
                  'div',
                  {
                    style: {
                      marginTop: '4px',
                      // Aligns under the inputs: toggle-arrow width + the 4px row gap.
                      marginLeft: `${replaceToggleWidth.value + 4}px`,
                      padding: '3px 6px',
                      fontSize: '11px',
                      borderRadius: '3px',
                      background: isLight.value ? 'rgba(200,120,0,0.1)' : 'rgba(200,120,0,0.15)',
                      color: isLight.value ? '#8a5000' : '#e0a030',
                    },
                  },
                  t(
                    'ide.search.replaceConfirmation',
                    { count: totalCount.value, files: fileCount },
                    { defaultValue: 'Replace {{count}} occurrences in {{files}} files?' },
                  ),
                )
              : null,

            // Toggle buttons
            h(
              'div',
              { style: { display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' } },
              [
                h(ToggleButton, {
                  active: caseSensitive.value,
                  onClick: () => {
                    caseSensitive.value = !caseSensitive.value
                  },
                  title: t('ide.search.caseSensitive', undefined, { defaultValue: 'Match Case' }),
                  molId: 'search-toggle-case',
                  glyph: 'Aa',
                }),
                h(ToggleButton, {
                  active: wholeWord.value,
                  onClick: () => {
                    wholeWord.value = !wholeWord.value
                  },
                  title: t('ide.search.wholeWord', undefined, { defaultValue: 'Match Whole Word' }),
                  molId: 'search-toggle-whole-word',
                  glyph: 'ab',
                }),
                h(ToggleButton, {
                  active: useRegex.value,
                  onClick: () => {
                    useRegex.value = !useRegex.value
                  },
                  title: t('ide.search.regex', undefined, {
                    defaultValue: 'Use Regular Expression',
                  }),
                  molId: 'search-toggle-regex',
                  glyph: '.*',
                }),
                h('div', { style: { flex: '1' } }),
                h(ToggleButton, {
                  active: showFilters.value,
                  onClick: () => {
                    showFilters.value = !showFilters.value
                  },
                  title: t('ide.search.toggleFilters', undefined, {
                    defaultValue: 'Toggle Filters',
                  }),
                  molId: 'search-toggle-filters',
                  glyph: '⋯',
                }),
              ],
            ),

            // Include/Exclude filters
            showFilters.value
              ? h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginTop: '4px',
                    },
                  },
                  [
                    h('input', {
                      type: 'text',
                      value: includeGlob.value,
                      onInput: (e: Event) => {
                        includeGlob.value = (e.target as HTMLInputElement).value
                      },
                      placeholder: t('ide.search.includeFiles', undefined, {
                        defaultValue: 'Files to include (e.g. *.ts)',
                      }),
                      style: filterStyle(),
                      onVnodeMounted: syncValueAttr,
                      onVnodeUpdated: syncValueAttr,
                    }),
                    h('input', {
                      type: 'text',
                      value: excludeGlob.value,
                      onInput: (e: Event) => {
                        excludeGlob.value = (e.target as HTMLInputElement).value
                      },
                      placeholder: t('ide.search.excludeFiles', undefined, {
                        defaultValue: 'Files to exclude (e.g. *.min.js)',
                      }),
                      style: filterStyle(),
                      onVnodeMounted: syncValueAttr,
                      onVnodeUpdated: syncValueAttr,
                    }),
                    // Excluded directories (VS Code search.exclude) — the
                    // project-wide set the SERVER applies to every search
                    // surface. Edited here, persisted by the host.
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } }, [
                      h(
                        'label',
                        {
                          style: {
                            fontSize: '10px',
                            color: 'var(--mol-color-text-secondary, #888)',
                          },
                          htmlFor: 'mol-search-excluded-dirs',
                        },
                        t('ide.search.excludedDirs', undefined, {
                          defaultValue:
                            'Excluded folders (applies to all searches, including the agent)',
                        }),
                      ),
                      h('input', {
                        id: 'mol-search-excluded-dirs',
                        type: 'text',
                        'data-mol-id': 'search-excluded-dirs',
                        // The placeholder is an EXAMPLE of the input (directory
                        // names) — the same in every language, never a sentence
                        // to translate.
                        translate: 'no',
                        value: excludedDirsDraft.value,
                        // Read-only viewers can see the set but not edit it.
                        readonly: props.readOnly === true || undefined,
                        onInput: (e: Event) => {
                          excludedDirsDraft.value = (e.target as HTMLInputElement).value
                        },
                        // React's synthetic onBlur derives from the bubbling
                        // `focusout` (see TabBar) — that is the pair to bind.
                        onFocusout: () => {
                          commitExcludedDirs()
                        },
                        onKeydown: (e: KeyboardEvent) => {
                          if (e.key === 'Enter') commitExcludedDirs()
                        },
                        placeholder: 'node_modules, .git, dist',
                        style: filterStyle(),
                        onVnodeMounted: syncValueAttr,
                        onVnodeUpdated: syncValueAttr,
                      }),
                    ]),
                  ],
                )
              : null,
          ]),

          // The failed request, in place of (search) or above (replace) the results summary
          failure.value && !loading.value
            ? h(
                'div',
                {
                  'data-mol-id': 'search-error',
                  role: 'alert',
                  class: cm.textError,
                  style: { padding: '2px 8px 4px 8px', fontSize: '11px' },
                },
                failure.value === 'search'
                  ? t('ide.search.searchFailed', undefined, { defaultValue: 'Search failed.' })
                  : t('ide.search.replaceFailed', undefined, {
                      defaultValue: 'Replace failed. The results show what the files contain now.',
                    }),
              )
            : null,

          // Results summary
          searched.value && !loading.value && failure.value !== 'search'
            ? h(
                'div',
                {
                  style: {
                    padding: '2px 8px 4px 8px',
                    fontSize: '11px',
                    color: 'var(--mol-color-text-secondary, #888)',
                  },
                },
                totalCount.value > 0
                  ? truncated.value
                    ? t(
                        'ide.search.resultsTruncated',
                        { count: totalCount.value, files: fileCount },
                        { defaultValue: '{{count}} results in {{files}} files (truncated)' },
                      )
                    : t(
                        'ide.search.results',
                        { count: totalCount.value, files: fileCount },
                        { defaultValue: '{{count}} results in {{files}} files' },
                      )
                  : t('ide.search.noResults', undefined, { defaultValue: 'No results found' }),
              )
            : null,

          loading.value
            ? h(
                'div',
                {
                  style: {
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: 'var(--mol-color-text-secondary, #888)',
                  },
                },
                t('ide.search.searching', undefined, { defaultValue: 'Searching…' }),
              )
            : null,

          // Results list
          h(
            'div',
            { style: { flex: '1', overflow: 'auto', minHeight: '0' } },
            results.value.map((result) =>
              h(FileResultGroup, {
                key: result.file,
                result,
                onResultClick: props.onResultClick,
                onReplaceInFile: handleReplaceInFile,
                isLight: isLight.value,
                showReplace: showReplace.value,
              }),
            ),
          ),
        ],
      )
    }
  },
})
