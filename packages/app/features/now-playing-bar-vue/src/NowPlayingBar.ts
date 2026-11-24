/**
 * Vue now-playing bar: artwork, title / artist, transport controls, scrubber
 * and volume slider.
 *
 * Vue counterpart of `@molecule/app-now-playing-bar-react`'s `NowPlayingBar` —
 * the same props (React names), the same ClassMap tokens and inline styles, and
 * the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { NowPlayingBarProps, NowPlayingTrack } from './types.js'

/**
 * Format a number of seconds as `m:ss` (or `0:00` for non-finite input).
 *
 * @param seconds - Seconds to format.
 * @returns The formatted `m:ss` string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Persistent now-playing bar: track artwork, title/artist, transport controls
 * (prev/play-pause/next), scrubber and volume slider.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller wraps it in their own `position: sticky` / `fixed` container. All
 * styling routes through `getClassMap()`; all user-visible text routes through
 * `t()` so the bar translates via the companion locale bond.
 */
export const NowPlayingBar = defineComponent({
  name: 'NowPlayingBar',
  props: {
    track: {
      type: Object as PropType<NowPlayingTrack | null>,
      default: undefined,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    onPlay: {
      type: Function as PropType<NowPlayingBarProps['onPlay']>,
      default: undefined,
    },
    onPause: {
      type: Function as PropType<NowPlayingBarProps['onPause']>,
      default: undefined,
    },
    onNext: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    onPrev: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    onSeek: {
      type: Function as PropType<NowPlayingBarProps['onSeek']>,
      default: undefined,
    },
    volume: {
      type: Number,
      default: undefined,
    },
    onVolumeChange: {
      type: Function as PropType<NowPlayingBarProps['onVolumeChange']>,
      default: undefined,
    },
    trailing: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The playback position the controlled scrubber shows. */
    const seekValue = (): number =>
      Math.min(props.currentTime, props.duration > 0 ? props.duration : 0)

    /** The scrubber's upper bound (`duration > 0 ? duration : 0`). */
    const seekMax = (): number => (props.duration > 0 ? props.duration : 0)

    /** React's play/pause toggle. */
    const handleToggle = (): void => {
      if (props.isPlaying) props.onPause?.()
      else props.onPlay?.()
    }

    /**
     * Seeks and writes the controlled value back, as React restores a
     * controlled range input after its change handler returns.
     *
     * @param event - The range input's native input event.
     */
    const handleSeek = (event: Event): void => {
      const element = event.target as HTMLInputElement
      props.onSeek?.(Number(element.value))
      element.value = String(seekValue())
    }

    /**
     * Reports a volume change and writes the controlled value back.
     *
     * @param event - The range input's native input event.
     */
    const handleVolume = (event: Event): void => {
      const element = event.target as HTMLInputElement
      props.onVolumeChange?.(Number(element.value))
      element.value = String(props.volume)
    }

    return (): VNode => {
      const rootClasses = cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 3),
        props.className,
      )

      if (props.track == null) {
        const emptyLabel = t('nowPlaying.empty', {}, { defaultValue: 'Nothing playing' })
        return h(
          'div',
          {
            role: 'region',
            'aria-label': emptyLabel,
            'data-mol-id': 'now-playing-bar',
            'data-mol-empty': 'true',
            class: rootClasses,
          },
          [
            h(
              'span',
              {
                class: cm.cn(cm.textSize('sm'), cm.textMuted),
                'data-mol-id': 'now-playing-bar-empty',
              },
              [emptyLabel],
            ),
          ],
        )
      }

      const track = props.track
      const playLabel = props.isPlaying
        ? t('nowPlaying.aria.pause', {}, { defaultValue: 'Pause' })
        : t('nowPlaying.aria.play', {}, { defaultValue: 'Play' })
      const prevLabel = t('nowPlaying.aria.prev', {}, { defaultValue: 'Previous track' })
      const nextLabel = t('nowPlaying.aria.next', {}, { defaultValue: 'Next track' })
      const seekLabel = t('nowPlaying.aria.seek', {}, { defaultValue: 'Seek' })
      const volumeLabel = t('nowPlaying.aria.volume', {}, { defaultValue: 'Volume' })
      const artworkAlt = t(
        'nowPlaying.aria.artwork',
        { title: track.title },
        { defaultValue: 'Artwork for {{title}}' },
      )
      const regionLabel = t(
        'nowPlaying.aria.region',
        { title: track.title },
        { defaultValue: 'Now playing: {{title}}' },
      )
      const truncate = {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
      }
      const trailing = slotOrProp(slots.trailing, props.trailing)

      return h(
        'div',
        {
          role: 'region',
          'aria-label': regionLabel,
          'data-mol-id': 'now-playing-bar',
          class: rootClasses,
        },
        [
          h(
            'div',
            {
              class: cm.cn(cm.shrink0),
              'data-mol-id': 'now-playing-bar-artwork',
              style: { width: '56px', height: '56px' },
            },
            [
              track.artwork
                ? h('img', {
                    src: track.artwork,
                    alt: artworkAlt,
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '6px',
                    },
                  })
                : h('div', {
                    'aria-hidden': 'true',
                    class: cm.cn(cm.flex({ align: 'center', justify: 'center' })),
                    style: { width: '100%', height: '100%', borderRadius: '6px' },
                  }),
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.stack(0)),
              'data-mol-id': 'now-playing-bar-meta',
              style: { minWidth: '0px', flex: '1 1 0%' },
            },
            [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                  'data-mol-id': 'now-playing-bar-title',
                  style: truncate,
                },
                [track.title],
              ),
              h(
                'span',
                {
                  class: cm.textSize('xs'),
                  'data-mol-id': 'now-playing-bar-artist',
                  style: truncate,
                },
                [track.artist],
              ),
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0),
              'data-mol-id': 'now-playing-bar-transport',
            },
            [
              ...(props.onPrev
                ? [
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: (event: MouseEvent) => props.onPrev?.(event),
                        'aria-label': prevLabel,
                        'data-mol-id': 'now-playing-bar-prev',
                        class: cm.cn(cm.cursorPointer),
                      },
                      ['⏮'],
                    ),
                  ]
                : []),
              h(
                'button',
                {
                  type: 'button',
                  onClick: handleToggle,
                  'aria-label': playLabel,
                  'aria-pressed': props.isPlaying,
                  'data-mol-id': 'now-playing-bar-play',
                  class: cm.cn(cm.cursorPointer),
                },
                [props.isPlaying ? '⏸' : '▶'],
              ),
              ...(props.onNext
                ? [
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: (event: MouseEvent) => props.onNext?.(event),
                        'aria-label': nextLabel,
                        'data-mol-id': 'now-playing-bar-next',
                        class: cm.cn(cm.cursorPointer),
                      },
                      ['⏭'],
                    ),
                  ]
                : []),
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })),
              'data-mol-id': 'now-playing-bar-scrubber',
              style: { flex: '2 1 0%', minWidth: '0px' },
            },
            [
              h(
                'span',
                { class: cm.textSize('xs'), 'data-mol-id': 'now-playing-bar-current-time' },
                [formatTime(props.currentTime)],
              ),
              h('input', {
                type: 'range',
                min: 0,
                max: seekMax(),
                step: 0.1,
                value: seekValue(),
                onInput: handleSeek,
                'aria-label': seekLabel,
                'data-mol-id': 'now-playing-bar-seek',
                style: { flex: '1 1 0%', minWidth: '0px' },
              }),
              h('span', { class: cm.textSize('xs'), 'data-mol-id': 'now-playing-bar-duration' }, [
                formatTime(props.duration),
              ]),
            ],
          ),
          ...(props.onVolumeChange && typeof props.volume === 'number'
            ? [
                h(
                  'div',
                  {
                    class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0),
                    'data-mol-id': 'now-playing-bar-volume',
                    style: { width: '120px' },
                  },
                  [
                    h('span', { 'aria-hidden': 'true' }, [props.volume === 0 ? '🔇' : '🔊']),
                    h('input', {
                      type: 'range',
                      min: 0,
                      max: 1,
                      step: 0.01,
                      value: props.volume,
                      onInput: handleVolume,
                      'aria-label': volumeLabel,
                      'data-mol-id': 'now-playing-bar-volume-slider',
                      style: { flex: '1 1 0%', minWidth: '0px' },
                    }),
                  ],
                ),
              ]
            : []),
          ...(toChildArray(trailing).length > 0
            ? [
                h(
                  'div',
                  {
                    class: cm.cn(cm.shrink0),
                    'data-mol-id': 'now-playing-bar-trailing',
                  },
                  trailing,
                ),
              ]
            : []),
        ],
      )
    }
  },
})
