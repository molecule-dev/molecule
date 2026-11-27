/**
 * Vue HTML5 audio player: play/pause, scrub bar, elapsed/total time and a mute
 * toggle, over a hidden `<audio>` element.
 *
 * Vue counterpart of `@molecule/app-audio-player-react`'s `AudioPlayer` — the
 * same props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * @module
 */

import {
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

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { AudioPlayerProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot into
 * the children React renders: the slot wins, a truthy prop becomes one child,
 * and an absent or falsy pair contributes nothing (React's `{node && …}`).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render, or null when React renders nothing.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] | null => {
  const nodes: VNodeChild[] = slot ? slot() : prop ? [prop] : []
  return toChildArray(nodes).length > 0 ? nodes : null
}

/**
 * Formats a duration in seconds as M:SS (90 → `1:30`), React's `fmt`.
 *
 * @param s - The duration in seconds.
 * @returns The formatted time.
 */
function fmt(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 audio player chrome — play/pause, scrub, time, mute, optional
 * visualizer slot. Use for podcasts, voice notes, music previews, narrated
 * lessons.
 *
 * @param props - Component props (see {@link AudioPlayerProps}).
 * @returns The audio player component.
 */
export const AudioPlayer = defineComponent({
  name: 'AudioPlayer',
  props: {
    src: { type: String, required: true },
    title: null,
    subtitle: null,
    visualizer: null,
    captions: String,
    captionsLang: String,
    captionsLabel: String,
    defaultMuted: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    autoPlay: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    onPlay: Function as PropType<AudioPlayerProps['onPlay']>,
    onPause: Function as PropType<AudioPlayerProps['onPause']>,
    onEnded: Function as PropType<AudioPlayerProps['onEnded']>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const audio = ref<HTMLAudioElement | null>(null)
    // React's `useState(!!autoPlay)` / `useState(!!defaultMuted)`: captured
    // once, at mount — a later prop change does not reset them.
    const playing = ref(!!props.autoPlay)
    const muted = ref(!!props.defaultMuted)
    const duration = ref(0)
    const current = ref(0)
    const track = ref<HTMLTrackElement | null>(null)
    const caption = ref('')

    // The <audio> element is hidden behind the custom controls, so the browser
    // paints no captions: the track is set to `hidden` (it still fires
    // `cuechange`) and the player shows the active cue text itself.
    let detachCaptions: (() => void) | null = null
    /** Removes the captions listener and clears the caption (React's cleanup). */
    const dropCaptions = (): void => {
      detachCaptions?.()
      detachCaptions = null
      caption.value = ''
    }
    /** Puts the captions track in `hidden` mode and listens for `cuechange`. */
    const syncCaptions = (): void => {
      const textTrack = track.value?.track
      if (!props.captions || !textTrack) return
      textTrack.mode = 'hidden'
      const onCue = (): void => {
        const cues = textTrack.activeCues ? Array.from(textTrack.activeCues) : []
        caption.value = cues.map((cue) => ('text' in cue ? String(cue.text) : '')).join('\n')
      }
      textTrack.addEventListener('cuechange', onCue)
      detachCaptions = () => {
        textTrack.removeEventListener('cuechange', onCue)
      }
    }
    // `immediate: false`: the first setup waits for `onMounted`, where the
    // `<track>` element (and its text track) exists.
    watch(
      () => props.captions,
      () => {
        dropCaptions()
        syncCaptions()
      },
      { flush: 'post' },
    )

    /** Reads the position from the media element (React's `timeupdate`). */
    const onTimeUpdate = (): void => {
      const a = audio.value
      if (a) current.value = a.currentTime
    }
    /** Reads the duration from the media element (React's `loadedmetadata`). */
    const onLoadedMetadata = (): void => {
      const a = audio.value
      if (a) duration.value = a.duration
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
      const a = audio.value
      if (!a) return
      a.addEventListener('timeupdate', onTimeUpdate)
      a.addEventListener('loadedmetadata', onLoadedMetadata)
      a.addEventListener('play', onPlayEvent)
      a.addEventListener('pause', onPauseEvent)
      a.addEventListener('ended', onEndedEvent)
      syncCaptions()
    })

    onBeforeUnmount(() => {
      const a = audio.value
      if (!a) return
      a.removeEventListener('timeupdate', onTimeUpdate)
      a.removeEventListener('loadedmetadata', onLoadedMetadata)
      a.removeEventListener('play', onPlayEvent)
      a.removeEventListener('pause', onPauseEvent)
      a.removeEventListener('ended', onEndedEvent)
      dropCaptions()
    })

    /** Toggles play/pause on the audio element (React's `toggle`). */
    const toggle = (): void => {
      const a = audio.value
      if (!a) return
      if (a.paused) void a.play()
      else a.pause()
    }

    /**
     * Seeks the audio element to a position in seconds (React's `seek`).
     * React restores a controlled input to the state value right after the
     * change handler returns, so the range is written back too.
     *
     * @param event - The range input's native input event.
     */
    const onSeek = (event: Event): void => {
      const element = event.target as HTMLInputElement
      const a = audio.value
      if (a) a.currentTime = Number(element.value)
      element.value = String(current.value)
    }

    /** Toggles the muted state on the media element and in the state (React's `toggleMute`). */
    const toggleMute = (): void => {
      const a = audio.value
      if (!a) return
      a.muted = !a.muted
      muted.value = a.muted
    }

    return (): VNode => {
      const title = slotOrProp(slots.title, props.title)
      const subtitle = slotOrProp(slots.subtitle, props.subtitle)
      const visualizer = slotOrProp(slots.visualizer, props.visualizer)
      return h('div', { class: cm.cn(cm.stack(2), cm.sp('p', 3), props.className) }, [
        h(
          'audio',
          {
            ref: audio,
            src: props.src,
            autoplay: props.autoPlay,
            muted: muted.value,
            preload: 'metadata',
            style: { display: 'none' },
          },
          [
            h('track', {
              ref: track,
              kind: 'captions',
              src: props.captions,
              srclang: props.captionsLang,
              label: props.captionsLabel ?? t('audio.captions', {}, { defaultValue: 'Captions' }),
            }),
          ],
        ),
        title || subtitle
          ? h('header', { class: cm.stack(0) }, [
              title
                ? h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, title)
                : null,
              subtitle ? h('span', { class: cm.textSize('xs') }, subtitle) : null,
            ])
          : null,
        visualizer,
        h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: toggle,
              'data-mol-id': 'audio-player-toggle',
              'aria-label': playing.value
                ? t('audio.pause', {}, { defaultValue: 'Pause' })
                : t('audio.play', {}, { defaultValue: 'Play' }),
            },
            () => [h('span', { 'aria-hidden': true }, playing.value ? '⏸' : '▶')],
          ),
          h('span', { class: cm.textSize('xs'), style: { minWidth: '64px' } }, [
            `${fmt(current.value)} / ${fmt(duration.value)}`,
          ]),
          h('input', {
            type: 'range',
            min: 0,
            max: duration.value || 0,
            step: 0.1,
            value: current.value,
            onInput: onSeek,
            'aria-label': t('audio.seek', {}, { defaultValue: 'Seek' }),
            'data-mol-id': 'audio-player-seek',
            class: cm.flex1,
          }),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: toggleMute,
              'data-mol-id': 'audio-player-mute',
              'aria-label': muted.value
                ? t('audio.unmute', {}, { defaultValue: 'Unmute' })
                : t('audio.mute', {}, { defaultValue: 'Mute' }),
            },
            () => [h('span', { 'aria-hidden': true }, muted.value ? '🔇' : '🔊')],
          ),
        ]),
        props.captions
          ? h(
              'p',
              {
                'aria-live': 'polite',
                'data-mol-id': 'audio-player-captions',
                lang: props.captionsLang,
                class: cm.textSize('sm'),
                style: { minHeight: '1.5em', whiteSpace: 'pre-line' },
              },
              [caption.value],
            )
          : null,
      ])
    }
  },
})
