import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A single chapter entry inside an episode / video / podcast track.
 * `id` is used as a stable React key, `startTime` is in seconds and
 * drives both the displayed timestamp and the `currentTime`-based
 * highlight. `thumbnail` is an optional small image (square) shown to
 * the left of the title.
 */
export interface Chapter {
  /** Stable identifier for the chapter (used as a React key). */
  id: string
  /** Chapter title shown as the primary label of the row. */
  title: string
  /** Chapter start time in seconds (used for sorting + seek + highlight). */
  startTime: number
  /** Optional thumbnail image URL (square). */
  thumbnail?: string
}

/** Chapter-list component props. */
export interface ChapterListProps {
  /**
   * Chapters to render. Order is preserved as-is (callers should pass
   * them in `startTime` order). The "current" chapter is the last one
   * whose `startTime` is `<= currentTime`.
   */
  chapters: Chapter[]
  /**
   * Current playback time in seconds. The chapter whose `startTime` is
   * the largest value `<= currentTime` is highlighted as the active
   * chapter. Pass `0` if playback hasn't started yet.
   */
  currentTime: number
  /**
   * Optional click handler called with the chapter's `startTime` when a
   * row is activated. When omitted the rows render as static, non-
   * interactive elements.
   */
  onSeek?: (startTime: number) => void
  /** Extra classes merged onto the root element. */
  className?: string
  /** Optional trailing slot rendered at the right edge of each row (e.g. download button). */
  rowTrailing?: (chapter: Chapter) => ReactNode
}

/**
 * Format a number of seconds as `m:ss` or `h:mm:ss` (or `0:00` for
 * non-finite / negative input). Used for chapter timestamps.
 *
 * @param seconds - Seconds to format.
 * @returns The formatted timestamp string.
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Find the index of the active chapter for a given `currentTime`.
 * Returns the index of the last chapter whose `startTime` is `<=
 * currentTime`. Returns `-1` when `chapters` is empty or `currentTime`
 * is before the first chapter.
 *
 * @param chapters - Chapters in start-time order.
 * @param currentTime - Current playback time in seconds.
 * @returns The active chapter index, or `-1`.
 */
export function findActiveChapterIndex(chapters: Chapter[], currentTime: number): number {
  let active = -1
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].startTime <= currentTime) active = i
    else break
  }
  return active
}

/**
 * Scrollable list of chapters with seek-to-on-click and a progress
 * highlight for the chapter the playhead is currently inside. Used by
 * podcast and video-streaming surfaces for in-episode chapter
 * navigation. Each row shows an optional small thumbnail, the chapter
 * title, and the timestamp.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the list
 * translates via the companion
 * `@molecule/app-locales-feature-chapter-list` locale bond.
 *
 * @param props - Component props.
 * @returns The chapter-list element.
 */
export function ChapterList(props: ChapterListProps) {
  const { chapters, currentTime, onSeek, className, rowTrailing } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const regionLabel = t('chapterList.aria.region', {}, { defaultValue: 'Chapters' })
  const emptyLabel = t(
    'chapterList.empty',
    {},
    { defaultValue: 'No chapters available for this episode.' },
  )
  const currentBadge = t('chapterList.current', {}, { defaultValue: 'Now playing' })

  if (chapters.length === 0) {
    return (
      <div
        role="region"
        aria-label={regionLabel}
        data-mol-id="chapter-list"
        className={cm.cn(cm.sp('p', 3), className)}
      >
        <p className={cm.cn(cm.textSize('sm'))} data-mol-id="chapter-list-empty">
          {emptyLabel}
        </p>
      </div>
    )
  }

  const activeIndex = findActiveChapterIndex(chapters, currentTime)

  return (
    <ul
      role="list"
      aria-label={regionLabel}
      data-mol-id="chapter-list"
      className={cm.cn(cm.stack(0 as const), className)}
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {chapters.map((chapter, index) => {
        const isActive = index === activeIndex
        const seekLabel = t(
          'chapterList.aria.seek',
          { title: chapter.title, timestamp: formatTimestamp(chapter.startTime) },
          { defaultValue: 'Jump to {{title}} at {{timestamp}}' },
        )
        const thumbnailAlt = t(
          'chapterList.aria.thumbnail',
          { title: chapter.title },
          { defaultValue: 'Thumbnail for {{title}}' },
        )

        const rowContent = (
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 2))}
            data-mol-id="chapter-list-row-content"
          >
            <div
              className={cm.cn(cm.shrink0)}
              data-mol-id="chapter-list-row-thumbnail"
              style={{ width: 48, height: 48 }}
            >
              {chapter.thumbnail ? (
                <img
                  src={chapter.thumbnail}
                  alt={thumbnailAlt}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 4,
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 4,
                  }}
                />
              )}
            </div>

            <div
              className={cm.cn(cm.stack(0 as const))}
              data-mol-id="chapter-list-row-meta"
              style={{ minWidth: 0, flex: '1 1 0%' }}
            >
              <span
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                data-mol-id="chapter-list-row-title"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {chapter.title}
              </span>
              <span className={cm.textSize('xs')} data-mol-id="chapter-list-row-timestamp">
                {formatTimestamp(chapter.startTime)}
                {isActive ? ` · ${currentBadge}` : null}
              </span>
            </div>

            {rowTrailing && (
              <div className={cm.cn(cm.shrink0)} data-mol-id="chapter-list-row-trailing">
                {rowTrailing(chapter)}
              </div>
            )}
          </div>
        )

        return (
          <li
            key={chapter.id}
            data-mol-id="chapter-list-row"
            data-active={isActive ? 'true' : 'false'}
            data-chapter-id={chapter.id}
          >
            {onSeek ? (
              <button
                type="button"
                onClick={() => onSeek(chapter.startTime)}
                aria-label={seekLabel}
                aria-current={isActive ? 'true' : undefined}
                data-mol-id="chapter-list-row-button"
                className={cm.cn(cm.cursorPointer)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {rowContent}
              </button>
            ) : (
              <div
                aria-current={isActive ? 'true' : undefined}
                data-mol-id="chapter-list-row-static"
              >
                {rowContent}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
