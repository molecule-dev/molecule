/**
 * Search-in-files panel — provides grep-like search across the project sandbox.
 *
 * @module
 */

import type { JSX } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useHttpClient, useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { getIcon } from 'material-file-icons'

import type { SearchPanelProps, SearchResponse, SearchResult } from '../types.js'

/** Extract the filename from a full path for the file icon. */
function basename(path: string): string {
  return path.split('/').pop() ?? path
}

/** File icon component reusing material-file-icons. */
function FileTypeIcon({ name }: { name: string }): JSX.Element {
  const { svg } = getIcon(name)
  return (
    <span
      style={{ display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/** Toggle button for search options (case sensitive, regex, whole word). */
const ToggleButton = memo(function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: string
}): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: '2px 5px',
        fontSize: 11,
        fontFamily: 'monospace',
        border: '1px solid',
        borderColor: active ? 'var(--mol-color-primary, #4070e0)' : 'var(--color-border, #333)',
        borderRadius: 3,
        background: active ? 'rgba(64,112,224,0.2)' : 'transparent',
        color: active ? 'var(--mol-color-primary, #4070e0)' : 'var(--mol-color-text-secondary, #888)',
        cursor: 'pointer',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
})

/** Collapsible result group for a single file. */
const FileResultGroup = memo(function FileResultGroup({
  result,
  onResultClick,
  isLight,
}: {
  result: SearchResult
  onResultClick?: (path: string, line: number) => void
  isLight: boolean
}): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '3px 8px',
          border: 'none',
          background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
          color: 'var(--mol-color-text, currentColor)',
          cursor: 'pointer',
          fontSize: 12,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, width: 12, textAlign: 'center', flexShrink: 0 }}>
          {collapsed ? '▶' : '▼'}
        </span>
        <FileTypeIcon name={basename(result.file)} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.file}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 8,
            background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          {result.matches.length}
        </span>
      </button>
      {!collapsed &&
        result.matches.map((match) => (
          <button
            key={`${result.file}:${match.line}`}
            type="button"
            onClick={() => onResultClick?.(result.file, match.line)}
            style={{
              display: 'flex',
              gap: 6,
              width: '100%',
              padding: '2px 8px 2px 32px',
              border: 'none',
              background: 'transparent',
              color: 'var(--mol-color-text, currentColor)',
              cursor: 'pointer',
              fontSize: 12,
              textAlign: 'left',
              fontFamily: 'monospace',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLight
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span
              style={{
                color: 'var(--mol-color-text-secondary, #888)',
                flexShrink: 0,
                minWidth: 30,
                textAlign: 'right',
              }}
            >
              {match.line}
            </span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {match.content}
            </span>
          </button>
        ))}
    </div>
  )
})

/**
 * Search-in-files panel for the IDE sidebar.
 *
 * @param root0 - The component props.
 * @param root0.projectId - The project to search in.
 * @param root0.onResultClick - Called when a match is clicked.
 * @param root0.className - Optional CSS class name.
 * @returns The search panel element.
 */
export function SearchPanel({ projectId, onResultClick, className }: SearchPanelProps): JSX.Element {
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const http = useHttpClient()

  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [includeGlob, setIncludeGlob] = useState('')
  const [excludeGlob, setExcludeGlob] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(
    async (pattern: string) => {
      if (!pattern.trim()) {
        setResults([])
        setTotalCount(0)
        setTruncated(false)
        setSearched(false)
        return
      }

      // Abort previous in-flight search
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const params = new URLSearchParams({ pattern })
        if (caseSensitive) params.set('caseSensitive', '1')
        if (useRegex) params.set('regex', '1')
        if (wholeWord) params.set('wholeWord', '1')
        if (includeGlob.trim()) params.set('include', includeGlob.trim())
        if (excludeGlob.trim()) params.set('exclude', excludeGlob.trim())

        const res = await http.get<SearchResponse>(
          `/projects/${projectId}/search?${params.toString()}`,
        )
        if (controller.signal.aborted) return
        setResults(res.data.results)
        setTotalCount(res.data.totalCount)
        setTruncated(res.data.truncated)
        setSearched(true)
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setTotalCount(0)
          setSearched(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    },
    [projectId, http, caseSensitive, useRegex, wholeWord, includeGlob, excludeGlob],
  )

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Re-search immediately when toggle options change (if we have a query)
  useEffect(() => {
    if (query.trim()) doSearch(query)
  }, [caseSensitive, useRegex, wholeWord, includeGlob, excludeGlob])

  const fileCount = results.length

  return (
    <div className={cm.cn(className)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search input row */}
      <div style={{ padding: '8px 8px 4px 8px' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ide.search.placeholder', undefined, { defaultValue: 'Search' })}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: 12,
              border: '1px solid var(--color-border, #333)',
              borderRadius: 3,
              background: isLight ? '#fff' : 'rgba(255,255,255,0.06)',
              color: 'var(--mol-color-text, currentColor)',
              outline: 'none',
              minWidth: 0,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title={t('ide.search.clear', undefined, { defaultValue: 'Clear' })}
              style={{
                padding: '2px 4px',
                border: 'none',
                background: 'transparent',
                color: 'var(--mol-color-text-secondary, #888)',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
          <ToggleButton
            active={caseSensitive}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title={t('ide.search.caseSensitive', undefined, { defaultValue: 'Match Case' })}
          >
            Aa
          </ToggleButton>
          <ToggleButton
            active={wholeWord}
            onClick={() => setWholeWord(!wholeWord)}
            title={t('ide.search.wholeWord', undefined, { defaultValue: 'Match Whole Word' })}
          >
            ab
          </ToggleButton>
          <ToggleButton
            active={useRegex}
            onClick={() => setUseRegex(!useRegex)}
            title={t('ide.search.regex', undefined, { defaultValue: 'Use Regular Expression' })}
          >
            .*
          </ToggleButton>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            title={t('ide.search.toggleFilters', undefined, { defaultValue: 'Toggle Filters' })}
            style={{
              padding: '2px 5px',
              fontSize: 11,
              border: '1px solid var(--color-border, #333)',
              borderRadius: 3,
              background: showFilters ? 'rgba(64,112,224,0.2)' : 'transparent',
              color: 'var(--mol-color-text-secondary, #888)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ⋯
          </button>
        </div>

        {/* Include/Exclude filters */}
        {showFilters && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <input
              type="text"
              value={includeGlob}
              onChange={(e) => setIncludeGlob(e.target.value)}
              placeholder={t('ide.search.includeFiles', undefined, {
                defaultValue: 'Files to include (e.g. *.ts)',
              })}
              style={{
                padding: '3px 6px',
                fontSize: 11,
                border: '1px solid var(--color-border, #333)',
                borderRadius: 3,
                background: isLight ? '#fff' : 'rgba(255,255,255,0.06)',
                color: 'var(--mol-color-text, currentColor)',
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={excludeGlob}
              onChange={(e) => setExcludeGlob(e.target.value)}
              placeholder={t('ide.search.excludeFiles', undefined, {
                defaultValue: 'Files to exclude (e.g. *.min.js)',
              })}
              style={{
                padding: '3px 6px',
                fontSize: 11,
                border: '1px solid var(--color-border, #333)',
                borderRadius: 3,
                background: isLight ? '#fff' : 'rgba(255,255,255,0.06)',
                color: 'var(--mol-color-text, currentColor)',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Results summary */}
      {searched && !loading && (
        <div
          style={{
            padding: '2px 8px 4px 8px',
            fontSize: 11,
            color: 'var(--mol-color-text-secondary, #888)',
          }}
        >
          {totalCount > 0
            ? truncated
              ? t('ide.search.resultsTruncated', { count: totalCount, files: fileCount }, {
                  defaultValue: `${totalCount} results in ${fileCount} files (truncated)`,
                })
              : t('ide.search.results', { count: totalCount, files: fileCount }, {
                  defaultValue: `${totalCount} results in ${fileCount} files`,
                })
            : t('ide.search.noResults', undefined, { defaultValue: 'No results found' })}
        </div>
      )}

      {loading && (
        <div
          style={{
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--mol-color-text-secondary, #888)',
          }}
        >
          {t('ide.search.searching', undefined, { defaultValue: 'Searching…' })}
        </div>
      )}

      {/* Results list */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {results.map((result) => (
          <FileResultGroup
            key={result.file}
            result={result}
            onResultClick={onResultClick}
            isLight={isLight}
          />
        ))}
      </div>
    </div>
  )
}

SearchPanel.displayName = 'SearchPanel'
