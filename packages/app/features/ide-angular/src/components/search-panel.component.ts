/**
 * Search-in-files panel — provides grep-like search and replace across the
 * project sandbox.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `SearchPanel` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The query is debounced (300 ms) into
 * a `GET /projects/:id/search` whose reply groups the matches per file; the
 * option toggles (`Aa` / `ab` / `.*`) re-search at once, the glob filters ride
 * the same request, and the excluded-directories editor commits a trimmed,
 * deduped set on blur or Enter for the host to persist. The replace strip
 * confirms with a second click, posts the bulk replace and re-searches.
 *
 * Inputs are declared the way the kit's other Angular feature components
 * declare them — one plain field per React prop, named in the decorator's
 * `inputs` array — and the panel's reactive state lives in signals, so a
 * debounced reply, a resolved replace or a locale switch redraws the view.
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the layout the
 * ClassMap can't express, serialized through `styleText` the way React writes
 * numbers. The glyph toggles write each CSS property directly (the DOM's
 * `cssText` parse drops `background: transparent` and `border-image: none`
 * beside the border longhands). All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  afterNextRender,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'
import { getIcon } from 'material-file-icons'

import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-angular'
import type { SearchResponse, SearchResult } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SEARCH_EXCLUDED_DIRS } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

const logger = getLogger('search')

/** The muted secondary text colour every label here uses. */
const MUTED_TEXT = 'var(--mol-color-text-secondary, #888)'

/** The active accent colour (the primary token, with React's fallback). */
const PRIMARY = 'var(--mol-color-primary, #4070e0)'

/** The default border colour (the border token, with React's fallback). */
const BORDER = 'var(--color-border, #333)'

/**
 * Extract the filename from a full path for the file icon.
 *
 * @param path - Full file path.
 * @returns The filename portion.
 */
function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path
}

/**
 * The inline-style texts that never change, serialized once with `styleText`
 * (React's camelCase numbers become `px` exactly the way React writes them;
 * the conformance normalizer sorts declarations, so key order is free).
 */
const STYLES = {
  /** The root column. */
  root: styleText({ display: 'flex', flexDirection: 'column', height: '100%' }),
  /** The search-input block's padding. */
  pad: styleText({ padding: '8px 8px 4px' }),
  /** The search-input row. */
  searchRow: styleText({ display: 'flex', gap: 4, alignItems: 'center' }),
  /** The replace-input row (aligned under the search row). */
  replaceRow: styleText({ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }),
  /** The clear (×) button inside the search row. */
  clear: styleText({
    padding: '2px 4px',
    border: 'medium',
    background: 'transparent',
    color: MUTED_TEXT,
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1',
  }),
  /** The option-toggle strip. */
  toggleRow: styleText({ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }),
  /** The spacer that pushes the filters toggle to the right edge. */
  flex1: styleText({ flex: '1 1 0%' }),
  /** The include/exclude filter column. */
  filtersCol: styleText({ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }),
  /** The excluded-directories editor's label + input column. */
  excludedWrap: styleText({ display: 'flex', flexDirection: 'column', gap: 2 }),
  /** The excluded-directories label. */
  excludedLabel: styleText({ fontSize: 10, color: MUTED_TEXT }),
  /** The results summary line. */
  resultsSummary: styleText({ padding: '2px 8px 4px', fontSize: 11, color: MUTED_TEXT }),
  /** The failed-request line (its colour is the ClassMap's `textError`). */
  error: styleText({ padding: '2px 8px 4px', fontSize: 11 }),
  /** The searching line. */
  searching: styleText({ padding: '2px 8px', fontSize: 11, color: MUTED_TEXT }),
  /** The scrollable results list. */
  list: styleText({ flex: '1 1 0%', overflow: 'auto', minHeight: 0 }),
  /** A file group's wrapper. */
  groupWrap: styleText({ marginBottom: 2 }),
  /** The file group's header row. */
  fileToggle: styleText({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flex: '1 1 0%',
    padding: '3px 8px',
    border: 'medium',
    background: 'transparent',
    color: 'var(--mol-color-text, currentColor)',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
    minWidth: 0,
  }),
  /** The collapse chevron. */
  caret: styleText({ fontSize: 10, width: 12, textAlign: 'center', flexShrink: 0 }),
  /** The file-type icon span. */
  fileIcon: styleText({ display: 'inline-flex', flexShrink: 0, width: 16, height: 16 }),
  /** The file path label, ellipsizing. */
  fileName: styleText({
    flex: '1 1 0%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  /** The per-file ↻ replace affordance. */
  replaceInFile: styleText({
    padding: '2px 6px',
    marginRight: 4,
    border: 'medium',
    background: 'transparent',
    color: MUTED_TEXT,
    cursor: 'pointer',
    fontSize: 11,
  }),
  /** A match row. */
  matchRow: styleText({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '2px 8px 2px 32px',
    border: 'medium',
    background: 'transparent',
    color: 'var(--mol-color-text, currentColor)',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
    fontFamily: 'monospace',
  }),
  /** A match's line number. */
  matchLine: styleText({ color: MUTED_TEXT, flexShrink: 0, minWidth: 30, textAlign: 'right' }),
  /** A match's source line, ellipsizing. */
  matchContent: styleText({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
} as const

/** One glyph toggle in the option strip. */
interface ToggleSpec {
  /** Stable id for agents/tests. */
  molId: string
  /** The decorative glyph (`Aa`, `ab`, `.*`, `⋯`). */
  glyph: string
  /** The i18n key for the accessible name. */
  key: string
  /** The English fallback. */
  fallback: string
}

/** The four glyph toggles, in render order. */
const TOGGLES: readonly ToggleSpec[] = [
  {
    molId: 'search-toggle-case',
    glyph: 'Aa',
    key: 'ide.search.caseSensitive',
    fallback: 'Match Case',
  },
  {
    molId: 'search-toggle-whole-word',
    glyph: 'ab',
    key: 'ide.search.wholeWord',
    fallback: 'Match Whole Word',
  },
  {
    molId: 'search-toggle-regex',
    glyph: '.*',
    key: 'ide.search.regex',
    fallback: 'Use Regular Expression',
  },
  {
    molId: 'search-toggle-filters',
    glyph: '⋯',
    key: 'ide.search.toggleFilters',
    fallback: 'Toggle Filters',
  },
] as const

/**
 * A result group's file-type icon: the file name's material icon injected as
 * the span's content (React's `FileTypeIcon` via `dangerouslySetInnerHTML`).
 * The span's inline style is the parent's; this component only fills it.
 */
@Component({
  selector: 'span[mol-search-file-icon]',
  standalone: true,
  inputs: ['fileName'],
  template: '',
})
class SearchPanelFileIcon implements OnChanges, AfterViewInit {
  /** The file's bare name. */
  fileName = ''

  /** The icon host span. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Applies the icon when the name arrives. */
  ngOnChanges(): void {
    this.apply()
  }

  /** Applies the icon once the span exists. */
  ngAfterViewInit(): void {
    this.apply()
  }

  /** Injects the file name's material icon. */
  private apply(): void {
    this.host.nativeElement.innerHTML = getIcon(this.fileName).svg
  }
}

/**
 * Search-in-files panel for the IDE sidebar with find-and-replace support.
 */
@Component({
  selector: 'div[mol-search-panel]',
  standalone: true,
  imports: [SearchPanelFileIcon],
  inputs: [
    'projectId',
    'onResultClick',
    'className',
    'excludedDirs',
    'onExcludedDirsChange',
    'readOnly',
  ],
  host: {
    '[class]': 'rootClass()',
    '[attr.style]': 's.root',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.pad">
      <div [attr.style]="s.searchRow">
        @if (!readOnly) {
          <button type="button" data-mol-id="search-replace-toggle" [attr.aria-expanded]="showReplace() ? 'true' : 'false'" (click)="toggleReplace()" [attr.title]="t('ide.search.toggleReplace', undefined, { defaultValue: 'Toggle Replace' })" [class]="cm.cn(cm.touchTargetCompact, cm.shrink0)" [style.background]="'transparent'" [style.border]="'medium'" [style.color]="replaceToggleColor" [style.cursor]="'pointer'" [style.font-size]="'10px'" [style.line-height]="'1'" [style.padding]="'0px'" [style.text-align]="'center'" [style.width.px]="replaceToggleWidth()">{{ showReplace() ? '▼' : '▶' }}</button>
        }
        <input #queryInput type="text" [value]="query()" [attr.value]="query()" (input)="onQueryInput($event)" [attr.placeholder]="t('ide.search.placeholder', undefined, { defaultValue: 'Search' })" [attr.style]="fieldStyle()" />
        @if (query()) {
          <button type="button" data-mol-id="search-clear" (click)="clearQuery()" [attr.title]="t('ide.search.clear', undefined, { defaultValue: 'Clear' })" [attr.aria-label]="t('ide.search.clear', undefined, { defaultValue: 'Clear' })" [class]="cm.cn(cm.touchTargetCompact, cm.shrink0)" [attr.style]="s.clear">×</button>
        }
      </div>
      @if (!readOnly && showReplace()) {
        <div [attr.style]="s.replaceRow">
          <div [attr.style]="replaceSpacerStyle()"></div>
          <input type="text" [value]="replacement()" [attr.value]="replacement()" (input)="onReplacementInput($event)" [attr.placeholder]="t('ide.search.replacePlaceholder', undefined, { defaultValue: 'Replace' })" [attr.style]="fieldStyle()" />
          <button type="button" data-mol-id="search-replace-all" (click)="handleReplaceAll()" [disabled]="!query().trim() || replacing()" [attr.title]="replaceAllTitle()" [class]="replaceAllClass()">{{ replaceAllLabel() }}</button>
        </div>
      }
      @if (!readOnly && showReplace() && confirmAll() && totalCount() > 0) {
        <div [attr.style]="replaceSummaryStyle()">{{ replaceConfirmationText() }}</div>
      }
      <div [attr.style]="s.toggleRow">
        @for (toggle of toggles; track toggle.molId) {
          @if (toggle.molId === 'search-toggle-filters') {
            <div [attr.style]="s.flex1"></div>
          }
          <button type="button" [attr.title]="toggleLabel(toggle)" [attr.aria-label]="toggleLabel(toggle)" [attr.aria-pressed]="isToggleActive(toggle.molId) ? 'true' : 'false'" [attr.data-mol-id]="toggle.molId" (click)="toggleOption(toggle.molId)" [class]="cm.touchTargetCompact" [style.background]="isToggleActive(toggle.molId) ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)' : 'transparent'" [style.border-color]="isToggleActive(toggle.molId) ? primary : border" [style.border-image]="'none'" [style.border-radius]="'3px'" [style.border-style]="'solid'" [style.border-width]="'1px'" [style.color]="isToggleActive(toggle.molId) ? primary : replaceToggleColor" [style.cursor]="'pointer'" [style.font-family]="'monospace'" [style.font-size]="'11px'" [style.line-height]="'1'" [style.padding]="'2px 5px'"><span aria-hidden="true">{{ toggle.glyph }}</span></button>
        }
      </div>
      @if (showFilters()) {
        <div [attr.style]="s.filtersCol">
          <input type="text" [value]="includeGlob()" [attr.value]="includeGlob()" (input)="onIncludeInput($event)" [attr.placeholder]="t('ide.search.includeFiles', undefined, { defaultValue: 'Files to include (e.g. *.ts)' })" [attr.style]="filterStyle()" />
          <input type="text" [value]="excludeGlob()" [attr.value]="excludeGlob()" (input)="onExcludeInput($event)" [attr.placeholder]="t('ide.search.excludeFiles', undefined, { defaultValue: 'Files to exclude (e.g. *.min.js)' })" [attr.style]="filterStyle()" />
          <div [attr.style]="s.excludedWrap">
            <label for="mol-search-excluded-dirs" [attr.style]="s.excludedLabel">{{ t('ide.search.excludedDirs', undefined, { defaultValue: 'Excluded folders (applies to all searches, including the agent)' }) }}</label>
            <input id="mol-search-excluded-dirs" type="text" data-mol-id="search-excluded-dirs" translate="no" [value]="excludedDirsDraft()" [attr.value]="excludedDirsDraft()" [attr.readonly]="readOnly === true ? '' : null" (input)="onExcludedInput($event)" (focusout)="commitExcludedDirs()" (keydown)="onExcludedKeydown($event)" placeholder="node_modules, .git, dist" [attr.style]="filterStyle()" />
          </div>
        </div>
      }
    </div>
    @if (failure() && !loading()) {
      <div data-mol-id="search-error" role="alert" [class]="cm.textError" [attr.style]="s.error">{{ failureText() }}</div>
    }
    @if (searched() && !loading() && failure() !== 'search') {
      <div [attr.style]="s.resultsSummary">{{ resultsText() }}</div>
    }
    @if (loading()) {
      <div [attr.style]="s.searching">{{ t('ide.search.searching', undefined, { defaultValue: 'Searching…' }) }}</div>
    }
    <div [attr.style]="s.list">
      @for (result of results(); track result.file) {
        <div [attr.style]="s.groupWrap">
          <div [attr.style]="groupRowStyle()">
            <button type="button" data-mol-id="search-file-toggle" [attr.aria-expanded]="collapsed(result.file) ? 'false' : 'true'" (click)="toggleFile(result.file)" [class]="cm.touchTargetCompact" [attr.style]="s.fileToggle"><span [attr.style]="s.caret">{{ collapsed(result.file) ? '▶' : '▼' }}</span><span mol-search-file-icon [fileName]="basename(result.file)" [attr.style]="s.fileIcon"></span><span [attr.style]="s.fileName">{{ result.file }}</span><span [attr.style]="badgeStyle()">{{ result.matches.length }}</span></button>
            @if (showReplace()) {
              <button type="button" data-mol-id="search-replace-in-file" (click)="handleReplaceInFile(result.file)" [attr.title]="t('ide.search.replaceInFile', undefined, { defaultValue: 'Replace in this file' })" [class]="cm.cn(cm.touchTargetCompact, cm.shrink0)" [attr.style]="s.replaceInFile">↻</button>
            }
          </div>
          @if (!collapsed(result.file)) {
            @for (match of result.matches; track match.line) {
              <button type="button" data-mol-id="search-match" (click)="resultClick(result.file, match.line)" [class]="cm.touchTargetCompact" [attr.style]="s.matchRow" (mouseenter)="matchEnter($event)" (mouseleave)="matchLeave($event)"><span [attr.style]="s.matchLine">{{ match.line }}</span><span [attr.style]="s.matchContent">{{ match.content }}</span></button>
            }
          }
        </div>
      }
    </div>`,
})
export class SearchPanel implements OnInit, OnChanges, OnDestroy {
  /** Project ID used for API calls. */
  projectId = ''

  /** Called when the user clicks a search result. */
  onResultClick?: (path: string, line: number) => void

  /** Extra classes for the root. */
  className?: string

  /** The project's excluded directory names (VS Code `search.exclude`). */
  excludedDirs?: string[]

  /** Persist an edited excluded-dir set (the host owns storage). */
  onExcludedDirsChange?: (dirs: string[]) => void

  /** Read-only mode (a project viewer): the replace strip is hidden. */
  readOnly = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /** The glyph toggles, in render order. */
  protected readonly toggles = TOGGLES

  /** The muted secondary colour for the replace disclosure toggle. */
  protected readonly replaceToggleColor = MUTED_TEXT

  /** The active accent colour. */
  protected readonly primary = PRIMARY

  /** The default border colour. */
  protected readonly border = BORDER

  /** The theme's mode signal (a switch redraws the tints). */
  private readonly mode = useThemeMode()

  /** The bonded HTTP client. */
  private readonly http = useHttpClient()

  /** Whether the viewport is phone-width (bigger inputs). */
  private readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse (bigger inputs, wider toggle). */
  private readonly isCoarse = useCoarsePointer()

  /** The live query text. */
  protected readonly query = signal('')

  /** Whether the search is case-sensitive. */
  private readonly caseSensitive = signal(false)

  /** Whether the query is a regular expression. */
  private readonly useRegex = signal(false)

  /** Whether the query matches whole words only. */
  private readonly wholeWord = signal(false)

  /** The include glob. */
  private readonly includeGlob = signal('')

  /** The exclude glob. */
  private readonly excludeGlob = signal('')

  /** Whether the include/exclude filter row is open. */
  private readonly showFilters = signal(false)

  /** The excluded-directories editor's draft text. */
  protected readonly excludedDirsDraft = signal([...DEFAULT_SEARCH_EXCLUDED_DIRS].join(', '))

  /** The reply's grouped results. */
  protected readonly results = signal<SearchResult[]>([])

  /** The reply's total match count. */
  private readonly totalCount = signal(0)

  /** Whether the reply was truncated. */
  private readonly truncated = signal(false)

  /** Whether a search request is in flight. */
  protected readonly loading = signal(false)

  /** Whether a search has completed (the summary line shows). */
  protected readonly searched = signal(false)

  /** The request that failed last, shown in place of the results summary; a search that succeeds clears it. */
  protected readonly failure = signal<'search' | 'replace' | null>(null)

  /** Whether the replace strip is open. */
  protected readonly showReplace = signal(false)

  /** The replacement text. */
  private readonly replacement = signal('')

  /** Whether a replace request is in flight. */
  protected readonly replacing = signal(false)

  /** Whether the next Replace All click is the confirmation. */
  protected readonly confirmAll = signal(false)

  /** Each file group's collapsed state, keyed by file path. */
  private readonly collapsedFiles = signal<Record<string, boolean>>({})

  /** The pending debounce timer. */
  private debounceId: ReturnType<typeof setTimeout> | undefined

  /** The search a later one supersedes. */
  private abortRef: AbortController | undefined

  /** The search input, focused on mount. */
  @ViewChild('queryInput') private queryInput?: ElementRef<HTMLInputElement>

  /** Seeds the excluded-dirs draft and schedules the mount-time search. */
  ngOnInit(): void {
    this.excludedDirsDraft.set(this.normalizedExcludedKey())
    this.scheduleSearch()
  }

  /**
   * Follows a new excluded-dir set (React's effect on the prop key) and a new
   * project (a new search).
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['excludedDirs']) this.excludedDirsDraft.set(this.normalizedExcludedKey())
    if (changes['projectId'] && !changes['projectId'].firstChange) this.scheduleSearch()
  }

  /**
   * Focuses the search input after the first render, as React does on mount.
   * The move runs after the view check: focusing during it would fire the
   * input's `focusin` listeners while Angular is still checking, and a state
   * change they make would never render.
   */
  constructor() {
    afterNextRender(() => this.queryInput?.nativeElement.focus())
  }

  /** Drops the pending debounce (React's effect cleanup on unmount). */
  ngOnDestroy(): void {
    if (this.debounceId !== undefined) clearTimeout(this.debounceId)
  }

  /**
   * The root's class: the host's own `className`, exactly through `cm.cn`.
   *
   * @returns The class string, or null when there is none.
   */
  protected rootClass(): string | null {
    return this.cm.cn(this.className) || null
  }

  /**
   * Whether the light theme is active.
   *
   * @returns True when the theme's mode is `light`.
   */
  private isLight(): boolean {
    return this.mode() === 'light'
  }

  /**
   * The text-input font size (16px on phones/touch: iOS zooms smaller fields).
   *
   * @returns The CSS font size.
   */
  private inputFontSize(): string {
    return this.isNarrow() || this.isCoarse() ? '16px' : '12px'
  }

  /**
   * The filter-input font size (16px on phones/touch).
   *
   * @returns The CSS font size.
   */
  private filterFontSize(): string {
    return this.isNarrow() || this.isCoarse() ? '16px' : '11px'
  }

  /**
   * The replace disclosure toggle's width (the replace input's alignment
   * column), wider on touch-first devices.
   *
   * @returns The pixel width.
   */
  protected replaceToggleWidth(): number {
    return this.isCoarse() ? 36 : 14
  }

  /**
   * A search field's inline style.
   *
   * @returns The style attribute text.
   */
  protected fieldStyle(): string | null {
    return styleText({
      flex: '1 1 0%',
      padding: '4px 6px',
      fontSize: this.inputFontSize(),
      border: '1px solid var(--color-border, #333)',
      borderRadius: 3,
      background: this.isLight() ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.06)',
      color: 'var(--mol-color-text, currentColor)',
      outline: 'none',
      minWidth: 0,
    })
  }

  /**
   * A filter field's inline style.
   *
   * @returns The style attribute text.
   */
  protected filterStyle(): string | null {
    return styleText({
      padding: '3px 6px',
      fontSize: this.filterFontSize(),
      border: '1px solid var(--color-border, #333)',
      borderRadius: 3,
      background: this.isLight() ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.06)',
      color: 'var(--mol-color-text, currentColor)',
      outline: 'none',
    })
  }

  /**
   * The spacer aligning the replace input under the search input.
   *
   * @returns The style attribute text.
   */
  protected replaceSpacerStyle(): string | null {
    return styleText({ width: `${this.replaceToggleWidth()}px`, flexShrink: 0 })
  }

  /**
   * The replace confirmation strip's inline style.
   *
   * @returns The style attribute text.
   */
  protected replaceSummaryStyle(): string | null {
    return styleText({
      marginTop: 4,
      marginLeft: `${this.replaceToggleWidth() + 4}px`,
      padding: '3px 6px',
      fontSize: 11,
      borderRadius: 3,
      background: this.isLight() ? 'rgba(200, 120, 0, 0.1)' : 'rgba(200, 120, 0, 0.15)',
      color: this.isLight() ? 'rgb(138, 80, 0)' : 'rgb(224, 160, 48)',
    })
  }

  /**
   * A file group's header-row style (the theme's tint).
   *
   * @returns The style attribute text.
   */
  protected groupRowStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      background: this.isLight() ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
    })
  }

  /**
   * A file group's match-count badge style.
   *
   * @returns The style attribute text.
   */
  protected badgeStyle(): string | null {
    return styleText({
      fontSize: 10,
      padding: '1px 5px',
      borderRadius: 8,
      background: this.isLight() ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
      flexShrink: 0,
    })
  }

  /**
   * The normalized excluded-dir key (the prop's set, or the default).
   *
   * @returns The comma-separated key.
   */
  private excludedPropKey(): string {
    return (this.excludedDirs ?? [...DEFAULT_SEARCH_EXCLUDED_DIRS]).join(',')
  }

  /**
   * The editor's draft text for the current excluded-dir set.
   *
   * @returns The comma-and-space separated draft.
   */
  private normalizedExcludedKey(): string {
    return this.excludedPropKey().split(',').filter(Boolean).join(', ')
  }

  /**
   * Commits the draft: parses, drops invalid names, dedupes, normalizes the
   * field and hands the set to the host when it changed.
   */
  protected commitExcludedDirs(): void {
    const dirs = [
      ...new Set(
        this.excludedDirsDraft()
          .split(',')
          .map((d) => d.trim())
          .filter((d) => /^[A-Za-z0-9._-]+$/.test(d)),
      ),
    ]
    this.excludedDirsDraft.set(dirs.join(', '))
    if (dirs.join(',') !== this.excludedPropKey()) this.onExcludedDirsChange?.(dirs)
  }

  /**
   * Whether a glyph toggle is on.
   *
   * @param molId - The toggle's data id.
   * @returns True when the option is active.
   */
  protected isToggleActive(molId: string): boolean {
    if (molId === 'search-toggle-case') return this.caseSensitive()
    if (molId === 'search-toggle-whole-word') return this.wholeWord()
    if (molId === 'search-toggle-regex') return this.useRegex()
    return this.showFilters()
  }

  /**
   * Flips a glyph toggle; the option toggles re-search at once and again after
   * the debounce, exactly as React's two effects do.
   *
   * @param molId - The toggle's data id.
   */
  protected toggleOption(molId: string): void {
    if (molId === 'search-toggle-filters') {
      this.showFilters.update((value) => !value)
      return
    }
    if (molId === 'search-toggle-case') this.caseSensitive.update((value) => !value)
    else if (molId === 'search-toggle-whole-word') this.wholeWord.update((value) => !value)
    else this.useRegex.update((value) => !value)
    this.scheduleSearch()
    if (this.query().trim()) void this.doSearch(this.query())
  }

  /**
   * The accessible name (and title) of a glyph toggle.
   *
   * @param toggle - The toggle.
   * @returns The translated label.
   */
  protected toggleLabel(toggle: ToggleSpec): string {
    return this.t(toggle.key, undefined, { defaultValue: toggle.fallback })
  }

  /** Opens or closes the replace strip (and drops a pending confirmation). */
  protected toggleReplace(): void {
    this.showReplace.update((value) => !value)
    this.confirmAll.set(false)
  }

  /**
   * Reads the query field into the query (React's controlled `onChange`).
   *
   * @param event - The native input event.
   */
  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value)
    this.scheduleSearch()
  }

  /** Clears the query. */
  protected clearQuery(): void {
    this.query.set('')
    this.scheduleSearch()
  }

  /**
   * Reads the replacement field (and drops a pending confirmation).
   *
   * @param event - The native input event.
   */
  protected onReplacementInput(event: Event): void {
    this.replacement.set((event.target as HTMLInputElement).value)
    this.confirmAll.set(false)
  }

  /**
   * Reads the include glob and re-searches.
   *
   * @param event - The native input event.
   */
  protected onIncludeInput(event: Event): void {
    this.includeGlob.set((event.target as HTMLInputElement).value)
    this.scheduleSearch()
    if (this.query().trim()) void this.doSearch(this.query())
  }

  /**
   * Reads the exclude glob and re-searches.
   *
   * @param event - The native input event.
   */
  protected onExcludeInput(event: Event): void {
    this.excludeGlob.set((event.target as HTMLInputElement).value)
    this.scheduleSearch()
    if (this.query().trim()) void this.doSearch(this.query())
  }

  /**
   * Reads the excluded-dirs draft.
   *
   * @param event - The native input event.
   */
  protected onExcludedInput(event: Event): void {
    this.excludedDirsDraft.set((event.target as HTMLInputElement).value)
  }

  /**
   * Commits the excluded-dirs draft on Enter.
   *
   * @param event - The native keydown event.
   */
  protected onExcludedKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.commitExcludedDirs()
  }

  /**
   * Whether a file group is collapsed.
   *
   * @param file - The file path.
   * @returns True when its matches are hidden.
   */
  protected collapsed(file: string): boolean {
    return this.collapsedFiles()[file] === true
  }

  /**
   * Collapses or expands a file group.
   *
   * @param file - The file path.
   */
  protected toggleFile(file: string): void {
    const next = { ...this.collapsedFiles() }
    next[file] = !this.collapsed(file)
    this.collapsedFiles.set(next)
  }

  /**
   * Opens a result at its line.
   *
   * @param file - The file path.
   * @param line - The line number.
   */
  protected resultClick(file: string, line: number): void {
    this.onResultClick?.(file, line)
  }

  /**
   * Replaces within one file.
   *
   * @param file - The file path.
   */
  protected handleReplaceInFile(file: string): void {
    void this.doReplace([file])
  }

  /** The two-click confirm, then the replace (React's `handleReplaceAll`). */
  protected handleReplaceAll(): void {
    if (this.confirmAll()) void this.doReplace()
    else this.confirmAll.set(true)
  }

  /**
   * The replace-all button's title (confirm prompt or the action).
   *
   * @returns The translated title.
   */
  protected replaceAllTitle(): string {
    return this.confirmAll()
      ? this.t('ide.search.confirmReplaceAll', undefined, {
          defaultValue: 'Click again to confirm',
        })
      : this.t('ide.search.replaceAll', undefined, { defaultValue: 'Replace All' })
  }

  /**
   * The replace-all button's label.
   *
   * @returns The translated label (or the pending glyph).
   */
  protected replaceAllLabel(): string {
    if (this.replacing()) return '…'
    return this.confirmAll()
      ? this.t('ide.search.confirm', undefined, { defaultValue: 'Confirm' })
      : this.t('ide.search.replaceAllShort', undefined, { defaultValue: 'All' })
  }

  /**
   * The replace-all button's class (its semantic colour follows the confirm).
   *
   * @returns The resolved classes.
   */
  protected replaceAllClass(): string {
    return this.cm.cn(
      this.cm.button({
        variant: 'solid',
        color: this.confirmAll() ? 'warning' : 'primary',
        size: 'xs',
      }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * The replace confirmation strip's text.
   *
   * @returns The translated confirmation.
   */
  protected replaceConfirmationText(): string {
    return this.t(
      'ide.search.replaceConfirmation',
      { count: this.totalCount(), files: this.results().length },
      { defaultValue: 'Replace {{count}} occurrences in {{files}} files?' },
    )
  }

  /**
   * The results summary line's text.
   *
   * @returns The translated summary.
   */
  protected resultsText(): string {
    const files = this.results().length
    if (this.totalCount() > 0) {
      return this.truncated()
        ? this.t(
            'ide.search.resultsTruncated',
            { count: this.totalCount(), files },
            { defaultValue: '{{count}} results in {{files}} files (truncated)' },
          )
        : this.t(
            'ide.search.results',
            { count: this.totalCount(), files },
            { defaultValue: '{{count}} results in {{files}} files' },
          )
    }
    return this.t('ide.search.noResults', undefined, { defaultValue: 'No results found' })
  }

  /**
   * The failed-request line's text.
   *
   * @returns The translated message for the failed search or replace.
   */
  protected failureText(): string {
    return this.failure() === 'search'
      ? this.t('ide.search.searchFailed', undefined, { defaultValue: 'Search failed.' })
      : this.t('ide.search.replaceFailed', undefined, {
          defaultValue: 'Replace failed. The results show what the files contain now.',
        })
  }

  /**
   * The file name for a path's icon.
   *
   * @param path - The file path.
   * @returns The filename portion.
   */
  protected basename(path: string): string {
    return fileNameOf(path)
  }

  /**
   * Tints a hovered match row (React's `onMouseEnter` writes the background
   * property directly).
   *
   * @param event - The native mouseenter event.
   */
  protected matchEnter(event: Event): void {
    const el = event.currentTarget as HTMLElement
    el.style.background = this.isLight() ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'
  }

  /**
   * Clears a match row's hover tint.
   *
   * @param event - The native mouseleave event.
   */
  protected matchLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = 'transparent'
  }

  /** Schedules the debounced search for the current query. */
  private scheduleSearch(): void {
    if (this.debounceId !== undefined) clearTimeout(this.debounceId)
    this.debounceId = setTimeout(() => {
      void this.doSearch(this.query())
    }, 300)
  }

  /**
   * Runs the search for `pattern` (React's `doSearch`): aborts the previous
   * in-flight request, resets on a blank pattern, and applies the reply —
   * unless a later search superseded it.
   *
   * @param pattern - The raw query text.
   */
  private async doSearch(pattern: string): Promise<void> {
    if (!pattern.trim()) {
      this.results.set([])
      this.totalCount.set(0)
      this.truncated.set(false)
      this.searched.set(false)
      this.failure.set(null)
      return
    }

    // Abort previous in-flight search
    this.abortRef?.abort()
    const controller = new AbortController()
    this.abortRef = controller

    this.loading.set(true)
    try {
      const params = new URLSearchParams({ pattern })
      if (this.caseSensitive()) params.set('caseSensitive', '1')
      if (this.useRegex()) params.set('regex', '1')
      if (this.wholeWord()) params.set('wholeWord', '1')
      if (this.includeGlob().trim()) params.set('include', this.includeGlob().trim())
      if (this.excludeGlob().trim()) params.set('exclude', this.excludeGlob().trim())

      const res = await this.http.get<SearchResponse>(
        `/projects/${this.projectId}/search?${params.toString()}`,
      )
      if (controller.signal.aborted) return
      this.applyResults(res.data.results)
      this.totalCount.set(res.data.totalCount)
      this.truncated.set(res.data.truncated)
      this.searched.set(true)
      this.failure.set(null)
    } catch (error) {
      if (!controller.signal.aborted) {
        logger.warn('Search request failed', { error })
        this.results.set([])
        this.totalCount.set(0)
        this.searched.set(true)
        this.failure.set('search')
      }
    } finally {
      if (!controller.signal.aborted) this.loading.set(false)
    }
  }

  /**
   * Applies a reply's results, dropping collapse state for files it no longer
   * lists (a group React unmounts forgets its collapse).
   *
   * @param next - The reply's grouped results.
   */
  private applyResults(next: SearchResult[]): void {
    const files = new Set(next.map((result) => result.file))
    const previous = this.collapsedFiles()
    const kept: Record<string, boolean> = {}
    for (const file of files) {
      if (previous[file] !== undefined) kept[file] = previous[file]
    }
    this.results.set(next)
    this.collapsedFiles.set(kept)
  }

  /**
   * Posts the bulk replace, then re-searches to update the results (React's
   * `doReplace`). A failed replace is logged and still re-searches, since it
   * may have changed some files first, and then shows the replace failure.
   *
   * @param targetFiles - The files to replace in (all when omitted).
   */
  private async doReplace(targetFiles?: string[]): Promise<void> {
    if (!this.query().trim()) return
    this.replacing.set(true)
    let replaceFailed = false
    try {
      await this.http.post(`/projects/${this.projectId}/replace`, {
        pattern: this.query(),
        replacement: this.replacement(),
        files: targetFiles,
        caseSensitive: this.caseSensitive(),
        regex: this.useRegex(),
        wholeWord: this.wholeWord(),
      })
    } catch (error) {
      logger.warn('Replace request failed', { error, files: targetFiles })
      replaceFailed = true
    }
    try {
      // Re-search to update results (doSearch handles its own failure)
      await this.doSearch(this.query())
      // Unless the re-search failed too: the results then show nothing, and the search failure says so.
      if (replaceFailed && this.failure() !== 'search') this.failure.set('replace')
    } finally {
      this.replacing.set(false)
      this.confirmAll.set(false)
    }
  }
}
