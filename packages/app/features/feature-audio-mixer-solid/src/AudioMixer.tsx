/**
 * Solid channel-strip mixer console.
 *
 * Solid counterpart of `@molecule/app-feature-audio-mixer-react`'s `AudioMixer`
 * — the same props (React names), the same ClassMap tokens and inline styles,
 * and the same DOM for the same input.
 *
 * @module
 */

import { createEffect, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AudioMixerProps, Channel, ChannelChangePatch, Send } from './types.js'
import { clampLevel, clampPan, MAX_LEVEL, MAX_PAN, MIN_LEVEL, MIN_PAN } from './utilities.js'

/**
 * Apply React's controlled `value` to a native range input: the live property
 * AND the `value` attribute (its `defaultValue`), so a fresh element and a
 * re-rendered one read the same.
 *
 * @param element - The range input.
 * @param value - The controlled value.
 */
const applyControlledValue = (element: HTMLInputElement | undefined, value: number): void => {
  if (!element) return
  const text = String(value)
  if (element.value !== text) element.value = text
  if (element.defaultValue !== text) element.defaultValue = text
}

/** Everything one channel strip needs to render (React's `ChannelStripProps`). */
interface ChannelStripProps {
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
}

/**
 * One send row: label plus a compact send-level fader. Internal building block
 * of `<AudioMixer>` (React's per-send node inside `ChannelStrip`).
 *
 * @param props - The send, its accessible label and change handler.
 * @returns The send row element.
 */
function SendRow(props: {
  /** The send this row edits. */
  send: Send
  /** The send's accessible label (`{{channel}} send to {{send}}`). */
  ariaLabel: string
  /** Receives the send's new clamped level. */
  onLevel: (level: number) => void
}): JSX.Element {
  const cm = getClassMap()
  let fader: HTMLInputElement | undefined

  createEffect(() => {
    applyControlledValue(fader, clampLevel(props.send.level))
  })

  const sendName = (): string => props.send.label ?? props.send.id

  return (
    <div
      data-mol-id="audio-mixer-send"
      data-send-id={props.send.id}
      style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}
    >
      <span
        class={cm.cn(cm.textSize('xs'))}
        style={{
          flex: '0 0 32px',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        }}
      >
        {sendName()}
      </span>
      <input
        ref={(element) => {
          fader = element
        }}
        type="range"
        min={MIN_LEVEL}
        max={MAX_LEVEL}
        step={0.01}
        aria-label={props.ariaLabel}
        aria-valuemin={MIN_LEVEL}
        aria-valuemax={MAX_LEVEL}
        aria-valuenow={clampLevel(props.send.level)}
        data-mol-id="audio-mixer-send-fader"
        style={{ flex: '1 1 0%' }}
        onInput={(event) => {
          props.onLevel(clampLevel(parseFloat(event.currentTarget.value)))
          applyControlledValue(fader, clampLevel(props.send.level))
        }}
      />
    </div>
  )
}

/**
 * One channel column: name header, vertical fader, pan knob, mute/solo buttons,
 * optional sends row. Internal building block of `<AudioMixer>` (React's
 * `ChannelStrip`).
 *
 * @param props - The strip's channel, labels, callback and master flag.
 * @returns The channel-strip element.
 */
function ChannelStrip(props: ChannelStripProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  let fader: HTMLInputElement | undefined
  let panKnob: HTMLInputElement | undefined

  // React keeps a controlled range input's live value on the prop, in the DOM
  // property AND the `value` attribute (its `defaultValue`) — at mount and
  // whenever the prop changes, including after the user has dragged.
  createEffect(() => {
    applyControlledValue(fader, clampLevel(props.channel.level))
    applyControlledValue(panKnob, clampPan(props.channel.pan))
  })

  /**
   * Emit a fader patch with the new clamped level.
   *
   * @param event - The range input's native input event.
   */
  const handleFader = (event: Event & { currentTarget: HTMLInputElement }): void => {
    props.onChange?.({
      id: props.channel.id,
      level: clampLevel(parseFloat(event.currentTarget.value)),
    })
    applyControlledValue(fader, clampLevel(props.channel.level))
  }

  /**
   * Emit a pan patch with the new clamped pan.
   *
   * @param event - The range input's native input event.
   */
  const handlePan = (event: Event & { currentTarget: HTMLInputElement }): void => {
    props.onChange?.({
      id: props.channel.id,
      pan: clampPan(parseFloat(event.currentTarget.value)),
    })
    applyControlledValue(panKnob, clampPan(props.channel.pan))
  }

  /**
   * Toggle mute and emit a patch.
   *
   * @param event - The button click event.
   */
  const handleMute = (event: MouseEvent): void => {
    event.preventDefault()
    props.onChange?.({ id: props.channel.id, muted: !props.channel.muted })
  }

  /**
   * Toggle solo and emit a patch.
   *
   * @param event - The button click event.
   */
  const handleSolo = (event: MouseEvent): void => {
    event.preventDefault()
    props.onChange?.({ id: props.channel.id, solo: !props.channel.solo })
  }

  /**
   * Emit a send patch for the send that moved, writing its controlled value back.
   *
   * @param send - The send that moved.
   * @param level - The new clamped level the user chose.
   */
  const handleSend = (send: Send, level: number): void => {
    props.onChange?.({ id: props.channel.id, sendId: send.id, sendLevel: level })
  }

  /**
   * Classes for a strip toggle (mute / solo): solid when engaged, outline idle.
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

  return (
    <div
      role="group"
      aria-label={props.channel.name}
      data-mol-id={props.isMaster ? 'audio-mixer-master-strip' : 'audio-mixer-channel-strip'}
      data-channel-id={props.channel.id}
      data-muted={props.channel.muted ? 'true' : 'false'}
      data-solo={props.channel.solo ? 'true' : 'false'}
      class={cm.cn()}
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        gap: '8px',
        'min-width': '96px',
        padding: '8px',
        'box-sizing': 'border-box',
      }}
    >
      <div
        data-mol-id="audio-mixer-channel-name"
        style={{
          width: '100%',
          'text-align': 'center',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
          'border-top': props.channel.color ? `3px solid ${props.channel.color}` : undefined,
          'padding-top': props.channel.color ? '4px' : '0px',
        }}
      >
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {props.channel.name}
        </span>
      </div>

      <div
        style={{
          height: `${props.faderHeight}px`,
          width: '32px',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        }}
      >
        <input
          ref={(element) => {
            fader = element
          }}
          type="range"
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          step={0.01}
          aria-label={t(
            'audioMixer.aria.fader',
            { name: props.labelName },
            { defaultValue: '{{name}} fader' },
          )}
          aria-valuemin={MIN_LEVEL}
          aria-valuemax={MAX_LEVEL}
          aria-valuenow={clampLevel(props.channel.level)}
          aria-orientation="vertical"
          data-mol-id={props.isMaster ? 'audio-mixer-master-fader' : 'audio-mixer-fader'}
          style={{
            width: `${props.faderHeight}px`,
            height: '24px',
            transform: 'rotate(-90deg)',
            'transform-origin': 'center',
          }}
          onInput={handleFader}
        />
      </div>

      <input
        ref={(element) => {
          panKnob = element
        }}
        type="range"
        min={MIN_PAN}
        max={MAX_PAN}
        step={0.01}
        aria-label={t(
          'audioMixer.aria.pan',
          { name: props.labelName },
          { defaultValue: '{{name}} pan' },
        )}
        aria-valuemin={MIN_PAN}
        aria-valuemax={MAX_PAN}
        aria-valuenow={clampPan(props.channel.pan)}
        data-mol-id="audio-mixer-pan"
        style={{ width: '64px' }}
        onInput={handlePan}
      />

      <div data-mol-id="audio-mixer-buttons" style={{ display: 'flex', gap: '4px' }}>
        <button
          type="button"
          aria-label={props.muteLabel}
          aria-pressed={props.channel.muted ? 'true' : 'false'}
          data-mol-id="audio-mixer-mute"
          class={toggleClass(props.channel.muted === true)}
          onClick={handleMute}
        >
          {props.muteInitial}
        </button>
        <button
          type="button"
          aria-label={props.soloLabel}
          aria-pressed={props.channel.solo ? 'true' : 'false'}
          data-mol-id="audio-mixer-solo"
          class={toggleClass(props.channel.solo === true)}
          onClick={handleSolo}
        >
          {props.soloInitial}
        </button>
      </div>

      <Show when={!props.isMaster && (props.channel.sends?.length ?? 0) > 0}>
        <div
          data-mol-id="audio-mixer-sends"
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: '4px',
            width: '100%',
            'padding-top': '4px',
            'border-top': '1px solid',
          }}
        >
          <span class={cm.cn(cm.textSize('xs'))} style={{ opacity: '0.7', 'text-align': 'center' }}>
            {props.sendsLabel}
          </span>
          <For each={props.channel.sends}>
            {(send) => (
              <SendRow
                send={send}
                ariaLabel={t(
                  'audioMixer.aria.send',
                  { channel: props.labelName, send: send.label ?? send.id },
                  { defaultValue: '{{channel}} send to {{send}}' },
                )}
                onLevel={(level) => handleSend(send, level)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
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
 * @returns The mixer element.
 */
export function AudioMixer(props: AudioMixerProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const faderHeight = (): number => props.faderHeight ?? 180

  return (
    <div
      role="group"
      aria-label={t('audioMixer.aria.console', {}, { defaultValue: 'Audio mixer console' })}
      data-mol-id="audio-mixer"
      class={cm.cn(props.className)}
      style={{
        display: 'flex',
        'align-items': 'stretch',
        gap: '8px',
        'overflow-x': 'auto',
        'user-select': 'none',
      }}
    >
      <For each={props.channels}>
        {(channel) => (
          <ChannelStrip
            channel={channel}
            faderHeight={faderHeight()}
            muteLabel={t('audioMixer.button.mute', {}, { defaultValue: 'Mute' })}
            soloLabel={t('audioMixer.button.solo', {}, { defaultValue: 'Solo' })}
            // The compact buttons show one letter; a locale's letter is its own
            // key, not the label's `charAt(0)` — which under a translated label
            // is an arbitrary slice of that string (and under en-XA a lone `⟦`).
            muteInitial={t('audioMixer.button.muteInitial', {}, { defaultValue: 'M' })}
            soloInitial={t('audioMixer.button.soloInitial', {}, { defaultValue: 'S' })}
            sendsLabel={t('audioMixer.sends', {}, { defaultValue: 'Sends' })}
            labelName={channel.name}
            onChange={props.onChannelChange}
            isMaster={false}
          />
        )}
      </For>
      <Show when={props.master}>
        {(master) => (
          <>
            <div
              data-mol-id="audio-mixer-divider"
              aria-hidden="true"
              style={{
                width: '1px',
                'align-self': 'stretch',
                background: 'currentcolor',
                opacity: '0.2',
                margin: '0px 4px',
              }}
            />
            <ChannelStrip
              channel={master()}
              faderHeight={faderHeight()}
              muteLabel={t('audioMixer.button.mute', {}, { defaultValue: 'Mute' })}
              soloLabel={t('audioMixer.button.solo', {}, { defaultValue: 'Solo' })}
              muteInitial={t('audioMixer.button.muteInitial', {}, { defaultValue: 'M' })}
              soloInitial={t('audioMixer.button.soloInitial', {}, { defaultValue: 'S' })}
              sendsLabel={t('audioMixer.sends', {}, { defaultValue: 'Sends' })}
              labelName={master().name || t('audioMixer.master', {}, { defaultValue: 'Master' })}
              onChange={props.onMasterChange}
              isMaster
            />
          </>
        )}
      </Show>
    </div>
  )
}
