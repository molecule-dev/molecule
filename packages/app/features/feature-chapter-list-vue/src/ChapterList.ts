/**
 * Vue scrollable chapter list with seek-to-on-click and a progress highlight.
 *
 * Vue counterpart of `@molecule/app-feature-chapter-list-react`'s
 * `ChapterList` — the same props (React names), the same ClassMap tokens, the
 * same i18n keys and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { findActiveChapterIndex, formatTimestamp } from './timestamps.js'
import type { Chapter } from './types.js'

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
 * @param props - Component props (see `ChapterListProps`).
 * @returns The chapter-list component.
 */
export const ChapterList = defineComponent({
  name: 'ChapterList',
  props: {
    /** Chapters to render, in start-time order. */
    chapters: {
      type: Array as PropType<Chapter[]>,
      required: true,
    },
    /** Current playback time in seconds. */
    currentTime: {
      type: Number,
      required: true,
    },
    /** Called with the chapter's `startTime` when a row is activated. */
    onSeek: {
      type: Function as PropType<((startTime: number) => void) | undefined>,
      default: undefined,
    },
    /** Extra classes merged onto the root element. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Optional trailing node for each row, called with that chapter. */
    rowTrailing: {
      type: Function as PropType<((chapter: Chapter) => VNodeChild) | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The row body React renders inside the button / static wrapper: thumbnail,
     * title, timestamp (with the "Now playing" badge when active) and the
     * optional trailing slot.
     *
     * @param chapter - The row's chapter.
     * @param isActive - Whether this chapter is the current one.
     * @returns The row-content node.
     */
    function rowContent(chapter: Chapter, isActive: boolean): VNode {
      const thumbnailAlt = t(
        'chapterList.aria.thumbnail',
        { title: chapter.title },
        { defaultValue: 'Thumbnail for {{title}}' },
      )
      const currentBadge = t('chapterList.current', {}, { defaultValue: 'Now playing' })

      const thumbnail = chapter.thumbnail
        ? h('img', {
            src: chapter.thumbnail,
            alt: thumbnailAlt,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px',
            },
          })
        : h('div', {
            'aria-hidden': 'true',
            style: {
              width: '100%',
              height: '100%',
              borderRadius: '4px',
            },
          })

      const timestamp = `${formatTimestamp(chapter.startTime)}${
        isActive ? ` · ${currentBadge}` : ''
      }`

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 2)),
          'data-mol-id': 'chapter-list-row-content',
        },
        [
          h(
            'div',
            {
              class: cm.cn(cm.shrink0),
              'data-mol-id': 'chapter-list-row-thumbnail',
              style: { width: '48px', height: '48px' },
            },
            [thumbnail],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.stack(0)),
              'data-mol-id': 'chapter-list-row-meta',
              style: { minWidth: '0px', flex: '1 1 0%' },
            },
            [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                  'data-mol-id': 'chapter-list-row-title',
                  style: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  },
                },
                [chapter.title],
              ),
              h('span', { class: cm.textSize('xs'), 'data-mol-id': 'chapter-list-row-timestamp' }, [
                timestamp,
              ]),
            ],
          ),
          ...(props.rowTrailing
            ? [
                h(
                  'div',
                  {
                    class: cm.cn(cm.shrink0),
                    'data-mol-id': 'chapter-list-row-trailing',
                  },
                  [props.rowTrailing(chapter)],
                ),
              ]
            : []),
        ],
      )
    }

    return (): VNode => {
      const regionLabel = t('chapterList.aria.region', {}, { defaultValue: 'Chapters' })

      if (props.chapters.length === 0) {
        const emptyLabel = t(
          'chapterList.empty',
          {},
          { defaultValue: 'No chapters available for this episode.' },
        )
        return h(
          'div',
          {
            role: 'region',
            'aria-label': regionLabel,
            'data-mol-id': 'chapter-list',
            class: cm.cn(cm.sp('p', 3), props.className),
          },
          [
            h(
              'p',
              {
                class: cm.cn(cm.textSize('sm')),
                'data-mol-id': 'chapter-list-empty',
              },
              [emptyLabel],
            ),
          ],
        )
      }

      const activeIndex = findActiveChapterIndex(props.chapters, props.currentTime)

      return h(
        'ul',
        {
          role: 'list',
          'aria-label': regionLabel,
          'data-mol-id': 'chapter-list',
          class: cm.cn(cm.stack(0), props.className),
          style: { listStyle: 'none', padding: '0px', margin: '0px' },
        },
        props.chapters.map((chapter, index) => {
          const isActive = index === activeIndex
          const seekLabel = t(
            'chapterList.aria.seek',
            { title: chapter.title, timestamp: formatTimestamp(chapter.startTime) },
            { defaultValue: 'Jump to {{title}} at {{timestamp}}' },
          )
          const current = isActive ? 'true' : undefined
          return h(
            'li',
            {
              key: chapter.id,
              'data-mol-id': 'chapter-list-row',
              'data-active': isActive ? 'true' : 'false',
              'data-chapter-id': chapter.id,
            },
            [
              props.onSeek
                ? h(
                    'button',
                    {
                      type: 'button',
                      onClick: () => props.onSeek?.(chapter.startTime),
                      'aria-label': seekLabel,
                      'aria-current': current,
                      'data-mol-id': 'chapter-list-row-button',
                      class: cm.cn(cm.cursorPointer),
                      style: {
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        padding: '0px',
                      },
                    },
                    [rowContent(chapter, isActive)],
                  )
                : h(
                    'div',
                    {
                      'aria-current': current,
                      'data-mol-id': 'chapter-list-row-static',
                    },
                    [rowContent(chapter, isActive)],
                  ),
            ],
          )
        }),
      )
    }
  },
})
