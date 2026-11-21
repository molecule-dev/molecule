/**
 * Vue HTML5 video player: play/pause, scrub bar, elapsed/total time, mute and
 * fullscreen, over a `<video>` element whose native controls are hidden.
 *
 * Vue counterpart of `@molecule/app-video-player-react`'s `VideoPlayer` — the
 * same props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * @module
 */

import { defineComponent, h, onBeforeUnmount, onMounted, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { VideoPlayerProps } from './types.js'

/**
 * Formats a time value in seconds as `m:ss`, React's `fmtTime`.
 *
 * @param s - The time in seconds.
 * @returns The formatted time.
 */
function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 video player with custom chrome — play/pause, scrub bar,
 * elapsed/total time, mute, fullscreen. Native controls are hidden so
 * the bar styles match the rest of the app (via ClassMap).
 *
 * @param props - Component props (see {@link VideoPlayerProps}).
 * @returns The video player component.
 */
export const VideoPlayer = defineComponent({
  name: 'VideoPlayer',
  props: {
    src: { type: String, required: true },
    poster: String,
    captionsSrc: String,
    captionsLang: { type: String, default: 'en' },
    captionsLabel: String,
    autoPlay: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultMuted: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    onPlay: Function as PropType<VideoPlayerProps['onPlay']>,
    onPause: Function as PropType<VideoPlayerProps['onPause']>,
    onEnded: Function as PropType<VideoPlayerProps['onEnded']>,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const video = ref<HTMLVideoElement | null>(null)
    // React's `useState(!!autoPlay)` / `useState(!!defaultMuted || !!autoPlay)`:
    // captured once, at mount — a later prop change does not reset them.
    const playing = ref(!!props.autoPlay)
    const muted = ref(!!props.defaultMuted || !!props.autoPlay)
    const duration = ref(0)
    const current = ref(0)

    /** Reads the position from the media element (React's `timeupdate`). */
    const onTimeUpdate = (): void => {
      const v = video.value
      if (v) current.value = v.currentTime
    }
    /** Reads the duration from the media element (React's `loadedmetadata`). */
    const onLoadedMetadata = (): void => {
      const v = video.value
      if (v) duration.value = v.duration
    }
    /** Marks the player as playing and calls `onPlay` (React's `play`). */
    const onPlayEvent = (): void => {
      playing.value = true
      props.onPlay?.()
    }
    /** Marks the player as paused and calls `onPause` (React's `pause`). */
    const onPauseEvent = (): void => {
      playing.value = false
      props.onPause?.()
    }
    /** Marks the player as paused and calls `onEnded` (React's `ended`). */
    const onEndedEvent = (): void => {
      playing.value = false
      props.onEnded?.()
    }

    onMounted(() => {
      const v = video.value
      if (!v) return
      v.addEventListener('timeupdate', onTimeUpdate)
      v.addEventListener('loadedmetadata', onLoadedMetadata)
      v.addEventListener('play', onPlayEvent)
      v.addEventListener('pause', onPauseEvent)
      v.addEventListener('ended', onEndedEvent)
    })

    onBeforeUnmount(() => {
      const v = video.value
      if (!v) return
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onLoadedMetadata)
      v.removeEventListener('play', onPlayEvent)
      v.removeEventListener('pause', onPauseEvent)
      v.removeEventListener('ended', onEndedEvent)
    })

    /** Toggles play/pause on the video element (React's `toggle`). */
    const toggle = (): void => {
      const v = video.value
      if (!v) return
      if (v.paused) void v.play()
      else v.pause()
    }

    /**
     * Seeks the video to a position in seconds (React's `seek`). React
     * restores a controlled input to the state value right after the change
     * handler returns, so the range is written back too.
     *
     * @param event - The range input's native input event.
     */
    const onSeek = (event: Event): void => {
      const element = event.target as HTMLInputElement
      const v = video.value
      if (v) v.currentTime = Number(element.value)
      element.value = String(current.value)
    }

    /** Toggles the muted state on the video element and in the state (React's `toggleMute`). */
    const toggleMute = (): void => {
      const v = video.value
      if (!v) return
      v.muted = !v.muted
      muted.value = v.muted
    }

    /** Requests or exits fullscreen for the video element (React's `toggleFullscreen`). */
    const toggleFullscreen = (): void => {
      const v = video.value
      if (!v) return
      if (document.fullscreenElement) void document.exitFullscreen()
      else void v.requestFullscreen?.()
    }

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.position('relative'), cm.bgScrim, props.className),
          style: { borderRadius: '8px', overflow: 'hidden' },
        },
        [
          h(
            'video',
            {
              ref: video,
              src: props.src,
              poster: props.poster,
              autoplay: props.autoPlay,
              muted: muted.value,
              style: { display: 'block', width: '100%', height: 'auto' },
            },
            // The captions track renders on every <video>, as React's does;
            // without a `captionsSrc` (an empty one included) it is a
            // captions track with no source.
            [
              h('track', {
                kind: 'captions',
                src: props.captionsSrc || undefined,
                srcLang: props.captionsLang,
                label: props.captionsLabel ?? t('video.captions', {}, { defaultValue: 'Captions' }),
                default: true,
              }),
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.bgScrim,
                cm.textOnTone,
                cm.sp('px', 3),
                cm.sp('py', 2),
              ),
              style: { position: 'absolute', left: 0, right: 0, bottom: 0 },
            },
            [
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: toggle,
                  'aria-label': playing.value
                    ? t('video.pause', {}, { defaultValue: 'Pause' })
                    : t('video.play', {}, { defaultValue: 'Play' }),
                },
                () => [playing.value ? '⏸' : '▶'],
              ),
              h(
                'span',
                { class: cm.textSize('xs'), style: { minWidth: '64px' } },
                `${fmtTime(current.value)} / ${fmtTime(duration.value)}`,
              ),
              h('input', {
                type: 'range',
                min: 0,
                max: duration.value || 0,
                step: 0.1,
                value: current.value,
                onInput: onSeek,
                'aria-label': t('video.seek', {}, { defaultValue: 'Seek' }),
                class: cm.flex1,
              }),
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: toggleMute,
                  'aria-label': muted.value
                    ? t('video.unmute', {}, { defaultValue: 'Unmute' })
                    : t('video.mute', {}, { defaultValue: 'Mute' }),
                },
                () => [muted.value ? '🔇' : '🔊'],
              ),
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: toggleFullscreen,
                  'aria-label': t('video.fullscreen', {}, { defaultValue: 'Fullscreen' }),
                },
                () => ['⛶'],
              ),
            ],
          ),
        ],
      )
  },
})
