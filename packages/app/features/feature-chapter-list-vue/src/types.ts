/**
 * Types for the Vue chapter list.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * A single chapter entry inside an episode / video / podcast track.
 * `id` is used as the stable row key, `startTime` is in seconds and drives
 * both the displayed timestamp and the `currentTime`-based highlight.
 * `thumbnail` is an optional small image (square) shown to the left of the
 * title.
 */
export interface Chapter {
  /** Stable identifier for the chapter (used as the row key). */
  id: string
  /** Chapter title shown as the primary label of the row. */
  title: string
  /** Chapter start time in seconds (used for ordering + seek + highlight). */
  startTime: number
  /** Optional thumbnail image URL (square). */
  thumbnail?: string
}

/** Chapter-list component props — the same props React's component accepts. */
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
  rowTrailing?: (chapter: Chapter) => VNodeChild
}
