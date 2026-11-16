/**
 * Solid scrollable chapter list with seek-to-on-click and a progress highlight.
 *
 * Solid counterpart of `@molecule/app-feature-chapter-list-react`'s
 * `ChapterList` — the same props (React names), the same ClassMap tokens, the
 * same i18n keys and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { findActiveChapterIndex, formatTimestamp } from './timestamps.js'
import type { Chapter, ChapterListProps } from './types.js'

/**
 * Scrollable list of chapters with seek-to-on-click and a progress
 * highlight for the chapter the playhead is currently inside. Used by
 * podcast and video-streaming surfaces for in-episode chapter
 * navigation. Each row shows an optional small thumbnail, the chapter
 * title, and the timestamp.
 *
 * All styling routes through `getClassMap()` (no raw class names). All
 * user-visible text routes through `t()` so the list translates via the
 * companion `@molecule/app-locales-feature-chapter-list` locale bond.
 *
 * React keys each row by the chapter's `id` value, so a re-passed or
 * re-ordered array keeps the rendered rows per id. Solid's `For` keys by
 * reference, so the rows are keyed through stable per-id records: the record
 * for an id is created once and reused, while each row's content reads the
 * CURRENT chapter for that id reactively.
 *
 * @param props - Component props (see {@link ChapterListProps}).
 * @returns The rendered chapter list.
 */
export const ChapterList: Component<ChapterListProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** One stable record per chapter id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()

  /**
   * The current rows, one stable record per id, in the chapters' order.
   *
   * @returns The keyed rows.
   */
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.chapters.map((chapter) => {
      seen.add(chapter.id)
      let row = records.get(chapter.id)
      if (!row) {
        row = { id: chapter.id }
        records.set(chapter.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current chapter with this id.
   *
   * @param id - The row's chapter id.
   * @returns The chapter, read from the current `chapters`.
   */
  const chapterFor = (id: string): Chapter =>
    props.chapters.find((chapter) => chapter.id === id) as Chapter

  /**
   * The current position of the chapter with this id.
   *
   * @param id - The row's chapter id.
   * @returns Its index in the current `chapters`.
   */
  const indexFor = (id: string): number => props.chapters.findIndex((chapter) => chapter.id === id)

  /**
   * The active chapter index for the current playback time.
   *
   * @returns The index, or `-1`.
   */
  const activeIndex = (): number => findActiveChapterIndex(props.chapters, props.currentTime)

  /**
   * Whether the row with this id is the active chapter.
   *
   * @param id - The row's chapter id.
   * @returns True for the highlighted chapter.
   */
  const isActive = (id: string): boolean => indexFor(id) === activeIndex()

  /**
   * The translated region / list label.
   *
   * @returns The label.
   */
  const regionLabel = (): string => t('chapterList.aria.region', {}, { defaultValue: 'Chapters' })

  /**
   * The translated empty-state message.
   *
   * @returns The message.
   */
  const emptyLabel = (): string =>
    t('chapterList.empty', {}, { defaultValue: 'No chapters available for this episode.' })

  /**
   * The section heading's class list.
   *
   * @returns The class string.
   */
  const emptyRootClasses = (): string => cm.cn(cm.sp('p', 3), props.className)

  /**
   * The populated list's class list.
   *
   * @returns The class string.
   */
  const listClasses = (): string => cm.cn(cm.stack(0), props.className)

  /**
   * One row's content: thumbnail, title, timestamp (with the "Now playing"
   * badge while active) and the optional trailing slot.
   *
   * @param id - The row's chapter id.
   * @returns The row-content element.
   */
  const rowContent = (id: string): JSX.Element => {
    const chapter = (): Chapter => chapterFor(id)
    const active = (): boolean => isActive(id)
    const currentBadge = (): string => t('chapterList.current', {}, { defaultValue: 'Now playing' })
    const timestamp = (): string =>
      `${formatTimestamp(chapter().startTime)}${active() ? ` · ${currentBadge()}` : ''}`
    const thumbnailAlt = (): string =>
      t(
        'chapterList.aria.thumbnail',
        { title: chapter().title },
        { defaultValue: 'Thumbnail for {{title}}' },
      )
    return (
      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 2))}
        data-mol-id="chapter-list-row-content"
      >
        <div
          class={cm.cn(cm.shrink0)}
          data-mol-id="chapter-list-row-thumbnail"
          style={{ width: '48px', height: '48px' }}
        >
          {chapter().thumbnail ? (
            <img
              src={chapter().thumbnail}
              alt={thumbnailAlt()}
              style={{
                width: '100%',
                height: '100%',
                'object-fit': 'cover',
                'border-radius': '4px',
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{ width: '100%', height: '100%', 'border-radius': '4px' }}
            />
          )}
        </div>
        <div
          class={cm.cn(cm.stack(0))}
          data-mol-id="chapter-list-row-meta"
          style={{ 'min-width': '0px', flex: '1 1 0%' }}
        >
          <span
            class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
            data-mol-id="chapter-list-row-title"
            style={{
              overflow: 'hidden',
              'text-overflow': 'ellipsis',
              'white-space': 'nowrap',
              display: 'block',
            }}
          >
            {chapter().title}
          </span>
          <span class={cm.textSize('xs')} data-mol-id="chapter-list-row-timestamp">
            {timestamp()}
          </span>
        </div>
        {props.rowTrailing ? (
          <div class={cm.cn(cm.shrink0)} data-mol-id="chapter-list-row-trailing">
            {props.rowTrailing(chapter())}
          </div>
        ) : null}
      </div>
    )
  }

  /**
   * The seek button's translated label.
   *
   * @param id - The row's chapter id.
   * @returns The label.
   */
  const seekLabel = (id: string): string =>
    t(
      'chapterList.aria.seek',
      {
        title: chapterFor(id).title,
        timestamp: formatTimestamp(chapterFor(id).startTime),
      },
      { defaultValue: 'Jump to {{title}} at {{timestamp}}' },
    )

  return (
    <>
      {props.chapters.length === 0 ? (
        <div
          role="region"
          aria-label={regionLabel()}
          data-mol-id="chapter-list"
          class={emptyRootClasses()}
        >
          <p class={cm.cn(cm.textSize('sm'))} data-mol-id="chapter-list-empty">
            {emptyLabel()}
          </p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label={regionLabel()}
          data-mol-id="chapter-list"
          class={listClasses()}
          style={{ 'list-style': 'none', padding: '0px', margin: '0px' }}
        >
          <For each={keyedRows()}>
            {(row) => {
              const active = (): boolean => isActive(row.id)
              return (
                <li
                  data-mol-id="chapter-list-row"
                  data-active={active() ? 'true' : 'false'}
                  data-chapter-id={row.id}
                >
                  {props.onSeek ? (
                    <button
                      type="button"
                      onClick={() => props.onSeek?.(chapterFor(row.id).startTime)}
                      aria-label={seekLabel(row.id)}
                      aria-current={active() ? 'true' : undefined}
                      data-mol-id="chapter-list-row-button"
                      /* mol-bespoke-button: list ROW, not a CTA — the button is a
                         transparent hit area wrapping the row's own content (title,
                         timestamp, trailing slot), so the inline background/border/
                         padding are native resets rather than a competing design.
                         The row is already taller than the touch floor. */
                      class={cm.cn(cm.cursorPointer)}
                      style={{
                        display: 'block',
                        width: '100%',
                        'text-align': 'left',
                        background: 'transparent',
                        // React declares `border: none`; jsdom's CSSOM serializes
                        // that shorthand back as `border: medium` (same computed
                        // border: no width, no style). Solid bakes this static
                        // style into the element's attribute, which jsdom keeps
                        // verbatim, so it is spelled the way React's DOM reads.
                        border: 'medium',
                        padding: '0px',
                      }}
                    >
                      {rowContent(row.id)}
                    </button>
                  ) : (
                    <div
                      aria-current={active() ? 'true' : undefined}
                      data-mol-id="chapter-list-row-static"
                    >
                      {rowContent(row.id)}
                    </div>
                  )}
                </li>
              )
            }}
          </For>
        </ul>
      )}
    </>
  )
}
