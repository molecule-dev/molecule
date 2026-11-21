/**
 * Vue channel-strip mixer console, rendered with `h()` so the component stays a
 * plain `.ts` module.
 *
 * Vue counterpart of `@molecule/app-feature-audio-mixer-react`'s `AudioMixer` —
 * the same props (React names), the same ClassMap tokens and inline styles, and
 * the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { AudioMixerProps, Channel, ChannelChangePatch } from './types.js'
import { clampLevel, clampPan, MAX_LEVEL, MAX_PAN, MIN_LEVEL, MIN_PAN } from './utilities.js'

/** The translate function the strip helpers call (React's `t`). */
type Translate = (key: string, values?: InterpolationValues, options?: TranslateOptions) => string

/** Everything one channel strip needs to render (React's `ChannelStripProps`). */
interface StripContext {
  /** The channel (or master channel) this strip shows. */
  channel: Channel
  /** Pixel height of the fader column. */
  faderHeight: number
  /** Translated mute button label. */
  muteLabel: string
  /** Translated solo button label. */
  soloLabel: string
  /** Translated letter the mute button shows (`audioMixer.button.muteInitial`). */
  muteInitial: string
  /** Translated letter the solo button shows (`audioMixer.button.soloInitial`). */
  soloInitial: string
  /** Translated sends row label. */
  sendsLabel: string
  /**
   * Channel name the fader/pan/send labels are built from — React's
   * `faderAria(channel.name)`, or `master.name || masterLabel` for the master.
   */
  labelName: string
  /** Receives every patch this strip emits. */
  onChange?: (patch: ChannelChangePatch) => void
  /** Whether this strip is the master column. */
  isMaster: boolean
  /** The current class map. */
  cm: UIClassMap
  /** Translation, already bound to the component (reactive on locale switches). */
  t: Translate
}

/**
 * Render a range input that behaves like React's controlled `value`: the prop
 * is written back both at mount and after every user change, as React restores
 * a controlled input.
 *
 * @param options - The input's attributes, controlled value and change handler.
 * @param options.value - The controlled value the input shows.
 * @param options.attributes - Every other attribute of the input.
 * @param options.onInput - The change handler, called with the native event.
 * @returns The range input vnode.
 */
function controlledRange(options: {
  value: number
  attributes: Record<string, unknown>
  onInput: (event: Event) => void
}): VNode {
  return h('input', {
    type: 'range',
    ...options.attributes,
    value: options.value,
    defaultValue: String(options.value),
    onInput: options.onInput,
  })
}

/**
 * One channel column: name header, vertical fader, pan knob, mute/solo buttons,
 * optional sends row. Internal building block of `<AudioMixer>` (React's
 * `ChannelStrip`).
 *
 * @param ctx - The strip's channel, labels, callback and class map.
 * @returns The channel-strip vnode.
 */
function renderStrip(ctx: StripContext): VNode {
  const {
    channel,
    faderHeight,
    muteLabel,
    soloLabel,
    muteInitial,
    soloInitial,
    sendsLabel,
    labelName,
    onChange,
    isMaster,
    cm,
    t,
  } = ctx

  const faderAria = t(
    'audioMixer.aria.fader',
    { name: labelName },
    { defaultValue: '{{name}} fader' },
  )
  const panAria = t('audioMixer.aria.pan', { name: labelName }, { defaultValue: '{{name}} pan' })
  const sendAria = (sendName: string): string =>
    t(
      'audioMixer.aria.send',
      { channel: labelName, send: sendName },
      { defaultValue: '{{channel}} send to {{send}}' },
    )

  const stripStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: '96px',
    padding: '8px',
    boxSizing: 'border-box',
  }

  const headerStyle = {
    width: '100%',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderTop: channel.color ? `3px solid ${channel.color}` : undefined,
    paddingTop: channel.color ? '4px' : '0px',
  }

  // Vertical fader: a horizontal range input rotated -90deg via CSS, which
  // keeps native keyboard accessibility, aria-valuenow/min/max and pointer
  // events while presenting as a vertical column.
  const faderTrackStyle = {
    width: `${faderHeight}px`,
    height: '24px',
    transform: 'rotate(-90deg)',
    transformOrigin: 'center',
  }
  const faderWrapStyle = {
    height: `${faderHeight}px`,
    width: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const channelLevel = clampLevel(channel.level)
  const channelPan = clampPan(channel.pan)

  /**
   * Emit a fader patch with the new clamped level.
   *
   * @param event - The range input's native input event.
   */
  const handleFader = (event: Event): void => {
    const element = event.target as HTMLInputElement
    onChange?.({ id: channel.id, level: clampLevel(parseFloat(element.value)) })
    element.value = String(channelLevel)
  }

  /**
   * Emit a pan patch with the new clamped pan.
   *
   * @param event - The range input's native input event.
   */
  const handlePan = (event: Event): void => {
    const element = event.target as HTMLInputElement
    onChange?.({ id: channel.id, pan: clampPan(parseFloat(element.value)) })
    element.value = String(channelPan)
  }

  /**
   * Toggle mute and emit a patch.
   *
   * @param event - The button click event.
   */
  const handleMute = (event: MouseEvent): void => {
    event.preventDefault()
    onChange?.({ id: channel.id, muted: !channel.muted })
  }

  /**
   * Toggle solo and emit a patch.
   *
   * @param event - The button click event.
   */
  const handleSolo = (event: MouseEvent): void => {
    event.preventDefault()
    onChange?.({ id: channel.id, solo: !channel.solo })
  }

  /**
   * Emit a send patch for the send that moved.
   *
   * @param sendId - Id of the send that moved.
   * @param sendLevel - The send's controlled level, written back after the change.
   * @param event - The range input's native input event.
   */
  const handleSend = (sendId: string, sendLevel: number, event: Event): void => {
    const element = event.target as HTMLInputElement
    onChange?.({ id: channel.id, sendId, sendLevel: clampLevel(parseFloat(element.value)) })
    element.value = String(sendLevel)
  }

  /**
   * Classes for a strip toggle (mute / solo). Engaged reads as a solid primary
   * button, idle as an outline one — both from the design system.
   *
   * @param engaged - Whether the toggle is currently on.
   * @returns The resolved class string.
   */
  const toggleClass = (engaged: boolean): string =>
    cm.cn(
      engaged
        ? cm.button({ variant: 'solid', color: 'primary', size: 'xs' })
        : cm.button({ variant: 'outline', size: 'xs' }),
      cm.touchTargetCompact,
    )

  const children: VNodeChild[] = [
    h('div', { 'data-mol-id': 'audio-mixer-channel-name', style: headerStyle }, [
      h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [channel.name]),
    ]),
    h('div', { style: faderWrapStyle }, [
      controlledRange({
        value: channelLevel,
        attributes: {
          min: MIN_LEVEL,
          max: MAX_LEVEL,
          step: 0.01,
          'aria-label': faderAria,
          'aria-valuemin': MIN_LEVEL,
          'aria-valuemax': MAX_LEVEL,
          'aria-valuenow': channelLevel,
          'aria-orientation': 'vertical',
          'data-mol-id': isMaster ? 'audio-mixer-master-fader' : 'audio-mixer-fader',
          style: faderTrackStyle,
        },
        onInput: handleFader,
      }),
    ]),
    controlledRange({
      value: channelPan,
      attributes: {
        min: MIN_PAN,
        max: MAX_PAN,
        step: 0.01,
        'aria-label': panAria,
        'aria-valuemin': MIN_PAN,
        'aria-valuemax': MAX_PAN,
        'aria-valuenow': channelPan,
        'data-mol-id': 'audio-mixer-pan',
        style: { width: '64px' },
      },
      onInput: handlePan,
    }),
    h('div', { 'data-mol-id': 'audio-mixer-buttons', style: { display: 'flex', gap: '4px' } }, [
      h(
        'button',
        {
          type: 'button',
          'aria-label': muteLabel,
          'aria-pressed': channel.muted ? 'true' : 'false',
          'data-mol-id': 'audio-mixer-mute',
          class: toggleClass(channel.muted === true),
          onClick: handleMute,
        },
        [muteInitial],
      ),
      h(
        'button',
        {
          type: 'button',
          'aria-label': soloLabel,
          'aria-pressed': channel.solo ? 'true' : 'false',
          'data-mol-id': 'audio-mixer-solo',
          class: toggleClass(channel.solo === true),
          onClick: handleSolo,
        },
        [soloInitial],
      ),
    ]),
  ]

  if (!isMaster && channel.sends !== undefined && channel.sends.length > 0) {
    children.push(
      h(
        'div',
        {
          'data-mol-id': 'audio-mixer-sends',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '100%',
            paddingTop: '4px',
            borderTop: '1px solid currentColor',
          },
        },
        [
          h(
            'span',
            { class: cm.cn(cm.textSize('xs')), style: { opacity: '0.7', textAlign: 'center' } },
            [sendsLabel],
          ),
          ...channel.sends.map((send) => {
            const sendLevel = clampLevel(send.level)
            const sendName = send.label ?? send.id
            return h(
              'div',
              {
                key: send.id,
                'data-mol-id': 'audio-mixer-send',
                'data-send-id': send.id,
                style: { display: 'flex', alignItems: 'center', gap: '4px' },
              },
              [
                h(
                  'span',
                  {
                    class: cm.cn(cm.textSize('xs')),
                    style: {
                      flex: '0 0 32px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  [sendName],
                ),
                controlledRange({
                  value: sendLevel,
                  attributes: {
                    min: MIN_LEVEL,
                    max: MAX_LEVEL,
                    step: 0.01,
                    'aria-label': sendAria(sendName),
                    'aria-valuemin': MIN_LEVEL,
                    'aria-valuemax': MAX_LEVEL,
                    'aria-valuenow': sendLevel,
                    'data-mol-id': 'audio-mixer-send-fader',
                    style: { flex: '1' },
                  },
                  onInput: (event: Event) => handleSend(send.id, sendLevel, event),
                }),
              ],
            )
          }),
        ],
      ),
    )
  }

  return h(
    'div',
    {
      role: 'group',
      'aria-label': channel.name,
      'data-mol-id': isMaster ? 'audio-mixer-master-strip' : 'audio-mixer-channel-strip',
      'data-channel-id': channel.id,
      'data-muted': channel.muted ? 'true' : 'false',
      'data-solo': channel.solo ? 'true' : 'false',
      class: cm.cn(),
      style: stripStyle,
    },
    children,
  )
}

/**
 * Multi-channel mixer console: one column per channel — name, vertical fader,
 * pan knob, mute/solo buttons, optional sends row — plus an optional master
 * column. Pure UI; the caller wires the emitted change patches back to whatever
 * audio engine they want (Tone.js, the Web Audio API, native `AudioContext`,
 * etc.).
 *
 * Styling routes through `getClassMap()` and all user-visible text routes
 * through `t()` via the companion locale bond
 * `@molecule/app-locales-feature-audio-mixer`.
 *
 * @param props - Component props (see {@link AudioMixerProps}).
 * @returns The mixer component.
 */
export const AudioMixer = defineComponent({
  name: 'AudioMixer',
  props: {
    channels: {
      type: Array as PropType<Channel[]>,
      required: true,
    },
    onChannelChange: {
      type: Function as PropType<AudioMixerProps['onChannelChange']>,
      default: undefined,
    },
    master: {
      type: Object as PropType<Channel>,
      default: undefined,
    },
    onMasterChange: {
      type: Function as PropType<AudioMixerProps['onMasterChange']>,
      default: undefined,
    },
    faderHeight: {
      type: Number,
      default: 180,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const consoleLabel = t('audioMixer.aria.console', {}, { defaultValue: 'Audio mixer console' })
      const masterLabel = t('audioMixer.master', {}, { defaultValue: 'Master' })
      const muteLabel = t('audioMixer.button.mute', {}, { defaultValue: 'Mute' })
      const soloLabel = t('audioMixer.button.solo', {}, { defaultValue: 'Solo' })
      // The compact buttons show one letter; a locale's letter is its own key,
      // not the label's `charAt(0)` — which under a translated label is an
      // arbitrary slice of that string (and under en-XA a lone `⟦`).
      const muteInitial = t('audioMixer.button.muteInitial', {}, { defaultValue: 'M' })
      const soloInitial = t('audioMixer.button.soloInitial', {}, { defaultValue: 'S' })
      const sendsLabel = t('audioMixer.sends', {}, { defaultValue: 'Sends' })

      const children: VNodeChild[] = props.channels.map((channel) =>
        renderStrip({
          channel,
          faderHeight: props.faderHeight,
          muteLabel,
          soloLabel,
          muteInitial,
          soloInitial,
          sendsLabel,
          labelName: channel.name,
          onChange: props.onChannelChange,
          isMaster: false,
          cm,
          t,
        }),
      )

      if (props.master !== undefined) {
        children.push(
          h('div', {
            'data-mol-id': 'audio-mixer-divider',
            'aria-hidden': 'true',
            style: {
              width: '1px',
              alignSelf: 'stretch',
              background: 'currentColor',
              opacity: '0.2',
              margin: '0 4px',
            },
          }),
        )
        children.push(
          renderStrip({
            channel: props.master,
            faderHeight: props.faderHeight,
            muteLabel,
            soloLabel,
            muteInitial,
            soloInitial,
            sendsLabel,
            labelName: props.master.name || masterLabel,
            onChange: props.onMasterChange,
            isMaster: true,
            cm,
            t,
          }),
        )
      }

      return h(
        'div',
        {
          role: 'group',
          'aria-label': consoleLabel,
          'data-mol-id': 'audio-mixer',
          class: cm.cn(props.className),
          style: {
            display: 'flex',
            alignItems: 'stretch',
            gap: '8px',
            overflowX: 'auto',
            userSelect: 'none',
          },
        },
        children,
      )
    }
  },
})
