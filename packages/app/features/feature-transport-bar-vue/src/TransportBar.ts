/**
 * Vue playback transport bar — play / pause / stop / record / skip / loop
 * controls for editor playback.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { TransportBarProps } from './types.js'

/**
 * One resolved time-display slot: the children React renders and whether React
 * renders the wrapper at all (React's `{slot && <div>…</div>}` after
 * `timeDisplay ?? children`).
 */
interface ResolvedSlot {
  /** The value React's `timeDisplay ?? children` produced. */
  value: VNodeChild
  /** The nodes inside the time-display div. */
  nodes: VNodeChild[]
  /** Whether the div itself renders. */
  renders: boolean
}

/**
 * Transport-control bar (play / pause / stop / record / skip / loop)
 * used by music-daw + video-editor surfaces for editor playback
 * control. Renders a horizontal bar of buttons with semantic icons and
 * fully translated `aria-label`s; an optional time-display slot lets
 * callers render the current playhead position / total duration without
 * coupling the bar to any specific time-format library.
 *
 * Vue counterpart of `@molecule/app-feature-transport-bar-react`'s
 * `TransportBar` — the same props (React names), the same DOM for the same
 * input, and the same callbacks. Node-valued props (`timeDisplay`) arrive as
 * a prop AND a same-named slot; `children` is the default slot.
 *
 * @param props - Component props (see {@link TransportBarProps}).
 * @returns The transport-bar component.
 */
export const TransportBar = defineComponent({
  name: 'TransportBar',
  props: {
    // Boolean props keep React's distinction between an absent/false value and
    // a `true` one: `default: undefined` disables Vue's absent-Boolean → false
    // casting, so an omitted `isPlaying` stays undefined as React's does.
    isPlaying: { type: Boolean as PropType<boolean>, default: undefined },
    isRecording: { type: Boolean as PropType<boolean>, default: undefined },
    canStop: { type: Boolean as PropType<boolean>, default: true },
    canSkip: { type: Boolean as PropType<boolean>, default: true },
    loop: { type: Boolean as PropType<boolean>, default: undefined },
    onPlayToggle: {
      type: Function as PropType<TransportBarProps['onPlayToggle']>,
      default: undefined,
    },
    onStop: { type: Function as PropType<TransportBarProps['onStop']>, default: undefined },
    onSkipBack: {
      type: Function as PropType<TransportBarProps['onSkipBack']>,
      default: undefined,
    },
    onSkipForward: {
      type: Function as PropType<TransportBarProps['onSkipForward']>,
      default: undefined,
    },
    onRecordToggle: {
      type: Function as PropType<TransportBarProps['onRecordToggle']>,
      default: undefined,
    },
    onLoopToggle: {
      type: Function as PropType<TransportBarProps['onLoopToggle']>,
      default: undefined,
    },
    timeDisplay: { default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // React's inline style object: only properties ClassMap does not expose
    // (background:transparent, border:none). A style object routes through the
    // CSSOM exactly as React's does, so it serializes identically.
    const buttonBaseStyle = {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    } as const

    /**
     * React's `timeDisplay ?? children`, then `Boolean(slot)` for the wrapper:
     * the same-named slot stands in for the prop, and a truthy value renders
     * the div (an empty string or `false` does not). A falsy value is not
     * dropped: React renders `{0 && …}` as the number itself, so `value` is
     * kept for the caller to place.
     *
     * @returns The slot's value, its nodes and whether the wrapper renders.
     */
    const resolveSlot = (): ResolvedSlot => {
      const named = slots.timeDisplay ? slots.timeDisplay() : undefined
      if (named !== undefined) {
        const value = named.length === 1 ? named[0] : named
        return {
          value,
          nodes: named,
          renders: named.length > 0 && Boolean(value),
        }
      }
      const display = props.timeDisplay
      if (display !== undefined && display !== null) {
        return {
          value: display,
          nodes: display ? [display] : [],
          renders: Boolean(display),
        }
      }
      const children = slots.default ? slots.default() : []
      const value = children.length === 1 ? children[0] : children.length > 1 ? children : undefined
      return { value, nodes: value ? children : [], renders: Boolean(value) }
    }

    return (): VNode => {
      const regionLabel = t(
        'transportBar.aria.region',
        {},
        { defaultValue: 'Playback transport controls' },
      )
      const skipBackLabel = t('transportBar.aria.skipBack', {}, { defaultValue: 'Skip backward' })
      const skipForwardLabel = t(
        'transportBar.aria.skipForward',
        {},
        { defaultValue: 'Skip forward' },
      )
      const playLabel = t('transportBar.aria.play', {}, { defaultValue: 'Play' })
      const pauseLabel = t('transportBar.aria.pause', {}, { defaultValue: 'Pause' })
      const stopLabel = t('transportBar.aria.stop', {}, { defaultValue: 'Stop' })
      const recordLabel = t('transportBar.aria.record', {}, { defaultValue: 'Record' })
      const stopRecordingLabel = t(
        'transportBar.aria.stopRecording',
        {},
        { defaultValue: 'Stop recording' },
      )
      const loopOnLabel = t('transportBar.aria.loopOn', {}, { defaultValue: 'Disable loop' })
      const loopOffLabel = t('transportBar.aria.loopOff', {}, { defaultValue: 'Enable loop' })

      const slot = resolveSlot()
      const controlClass = cm.cn(cm.cursorPointer, cm.sp('p', 1))

      return h(
        'div',
        {
          role: 'toolbar',
          'aria-label': regionLabel,
          'data-mol-id': 'transport-bar',
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2), props.className),
        },
        [
          props.onSkipBack
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: props.onSkipBack,
                  disabled: !props.canSkip,
                  'aria-label': skipBackLabel,
                  'data-mol-id': 'transport-bar-skip-back',
                  class: controlClass,
                  style: buttonBaseStyle,
                },
                [h('span', { 'aria-hidden': 'true' }, '⏮')],
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              onClick: props.onPlayToggle,
              'aria-label': props.isPlaying ? pauseLabel : playLabel,
              'aria-pressed': props.isPlaying,
              'data-mol-id': 'transport-bar-play-toggle',
              'data-state': props.isPlaying ? 'playing' : 'paused',
              class: controlClass,
              style: buttonBaseStyle,
            },
            [h('span', { 'aria-hidden': 'true' }, props.isPlaying ? '⏸' : '▶')],
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: props.onStop,
              disabled: !props.canStop,
              'aria-label': stopLabel,
              'data-mol-id': 'transport-bar-stop',
              class: controlClass,
              style: buttonBaseStyle,
            },
            [h('span', { 'aria-hidden': 'true' }, '⏹')],
          ),
          props.onSkipForward
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: props.onSkipForward,
                  disabled: !props.canSkip,
                  'aria-label': skipForwardLabel,
                  'data-mol-id': 'transport-bar-skip-forward',
                  class: controlClass,
                  style: buttonBaseStyle,
                },
                [h('span', { 'aria-hidden': 'true' }, '⏭')],
              )
            : null,
          props.onRecordToggle
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: props.onRecordToggle,
                  'aria-label': props.isRecording ? stopRecordingLabel : recordLabel,
                  'aria-pressed': props.isRecording === true,
                  'data-mol-id': 'transport-bar-record-toggle',
                  'data-state': props.isRecording ? 'recording' : 'idle',
                  class: controlClass,
                  style: buttonBaseStyle,
                },
                [h('span', { 'aria-hidden': 'true' }, '●')],
              )
            : null,
          props.onLoopToggle
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: props.onLoopToggle,
                  'aria-label': props.loop ? loopOnLabel : loopOffLabel,
                  'aria-pressed': props.loop === true,
                  'data-mol-id': 'transport-bar-loop-toggle',
                  'data-state': props.loop ? 'on' : 'off',
                  class: controlClass,
                  style: buttonBaseStyle,
                },
                [h('span', { 'aria-hidden': 'true' }, '↻')],
              )
            : null,
          slot.renders
            ? h(
                'div',
                {
                  'data-mol-id': 'transport-bar-time-display',
                  class: cm.cn(cm.textSize('sm'), cm.sp('px', 2)),
                },
                slot.nodes,
              )
            : // React's `{slot && …}` yields the falsy value itself, and React
              // renders a number there (`0` shows as the text "0").
              typeof slot.value === 'number'
              ? slot.value
              : null,
        ],
      )
    }
  },
})
