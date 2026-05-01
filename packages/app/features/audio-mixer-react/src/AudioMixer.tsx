import type { ChangeEvent, CSSProperties, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A single send target on a channel — points at another channel/bus by
 * id and carries a 0..1 send level. The mixer renders sends as a small
 * row of compact level controls under the channel strip.
 */
export interface Send {
  /** Stable identifier for the send (used as a React key + handler arg). */
  id: string
  /**
   * Optional human-readable target label. When omitted the mixer falls
   * back to the send id for accessibility. Locale bonds typically don't
   * translate this — it's user-authored bus naming.
   */
  label?: string
  /** Send level in the closed interval `[0, 1]`. Out-of-range clamps. */
  level: number
}

/**
 * One channel strip on the mixer console. The mixer is purely
 * presentational — `level` and `pan` are projected onto a fader and
 * pan knob, and the caller is expected to wire `onChannelChange`
 * callbacks back to a real audio engine (e.g. Tone.js, the Web Audio
 * API, native `AudioContext`).
 */
export interface Channel {
  /** Stable identifier for the channel (used as a React key + handler arg). */
  id: string
  /** Channel display name (already localized by the caller, if needed). */
  name: string
  /** Fader level in the closed interval `[0, 1]`. */
  level: number
  /** Pan position in the closed interval `[-1, 1]` (left to right). */
  pan: number
  /** Whether the channel is currently muted. */
  muted: boolean
  /** Whether the channel is currently solo'd. */
  solo: boolean
  /** Optional sends row (post-fader auxiliary sends). */
  sends?: Send[]
  /**
   * Optional accent color for the channel header strip. When omitted
   * the header uses an inherited text color so it adapts to themes.
   */
  color?: string
}

/**
 * Patch describing the changed fields for a single channel-change
 * event. Always carries the channel id; the touched field is set to
 * its new value and the rest are absent. `sendId` + `sendLevel` are
 * used together when a send fader moved.
 */
export interface ChannelChangePatch {
  /** Channel that changed. */
  id: string
  /** New fader level (only set when the main fader moved). */
  level?: number
  /** New pan position (only set when the pan knob moved). */
  pan?: number
  /** New mute state (only set when the mute button toggled). */
  muted?: boolean
  /** New solo state (only set when the solo button toggled). */
  solo?: boolean
  /** Send id (only set together with `sendLevel`). */
  sendId?: string
  /** New send level (only set together with `sendId`). */
  sendLevel?: number
}

/** Props for `<AudioMixer>`. */
export interface AudioMixerProps {
  /** Channels rendered as columns from left to right. Order is preserved. */
  channels: Channel[]
  /**
   * Called for every user-initiated change with a partial patch
   * describing which field moved. Faders/knobs emit a stream of
   * patches as the user drags; mute/solo emit a single patch on
   * click.
   */
  onChannelChange?: (patch: ChannelChangePatch) => void
  /**
   * Optional master channel — rendered as a final, visually-separated
   * column. The master strip omits the sends row but otherwise
   * behaves like a regular channel.
   */
  master?: Channel
  /**
   * Called when the master channel changes (only fires when `master`
   * is supplied). Same patch shape as `onChannelChange`.
   */
  onMasterChange?: (patch: ChannelChangePatch) => void
  /** Pixel height of the fader column. Defaults to 180. */
  faderHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string
}

/** Minimum allowed fader level. */
export const MIN_LEVEL = 0
/** Maximum allowed fader level. */
export const MAX_LEVEL = 1
/** Minimum allowed pan position (full left). */
export const MIN_PAN = -1
/** Maximum allowed pan position (full right). */
export const MAX_PAN = 1

/**
 * Clamp a fader/send level into the closed interval `[0, 1]`. Returns
 * `0` for non-finite inputs.
 *
 * @param value - Candidate level.
 * @returns The clamped level.
 */
export function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEVEL
  if (value < MIN_LEVEL) return MIN_LEVEL
  if (value > MAX_LEVEL) return MAX_LEVEL
  return value
}

/**
 * Clamp a pan position into the closed interval `[-1, 1]`. Returns `0`
 * (center) for non-finite inputs.
 *
 * @param value - Candidate pan position.
 * @returns The clamped pan position.
 */
export function clampPan(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < MIN_PAN) return MIN_PAN
  if (value > MAX_PAN) return MAX_PAN
  return value
}

/**
 * Multi-channel mixer console. Renders one column per channel —
 * name, vertical fader, pan knob, mute/solo buttons, optional sends
 * row — plus an optional master column. Pure UI; the caller wires
 * the emitted change patches back to whatever audio engine they
 * want (Tone.js, the Web Audio API, native `AudioContext`, etc.).
 *
 * Styling routes through `getClassMap()` and all user-visible text
 * routes through `t()` via the companion locale bond
 * `@molecule/app-locales-feature-audio-mixer-react`.
 *
 * @param props - Component props.
 * @returns The mixer element.
 */
export function AudioMixer(props: AudioMixerProps) {
  const { channels, onChannelChange, master, onMasterChange, faderHeight = 180, className } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const consoleLabel = t('audioMixer.aria.console', {}, { defaultValue: 'Audio mixer console' })
  const masterLabel = t('audioMixer.master', {}, { defaultValue: 'Master' })
  const muteLabel = t('audioMixer.button.mute', {}, { defaultValue: 'Mute' })
  const soloLabel = t('audioMixer.button.solo', {}, { defaultValue: 'Solo' })
  const faderAria = (channelName: string) =>
    t('audioMixer.aria.fader', { name: channelName }, { defaultValue: '{{name}} fader' })
  const panAria = (channelName: string) =>
    t('audioMixer.aria.pan', { name: channelName }, { defaultValue: '{{name}} pan' })
  const sendAria = (channelName: string, sendName: string) =>
    t(
      'audioMixer.aria.send',
      { channel: channelName, send: sendName },
      { defaultValue: '{{channel}} send to {{send}}' },
    )
  const sendsLabel = t('audioMixer.sends', {}, { defaultValue: 'Sends' })

  const rootStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    overflowX: 'auto',
    userSelect: 'none',
  }

  return (
    <div
      role="group"
      aria-label={consoleLabel}
      data-mol-id="audio-mixer"
      className={cm.cn(className)}
      style={rootStyle}
    >
      {channels.map((channel) => (
        <ChannelStrip
          key={channel.id}
          channel={channel}
          faderHeight={faderHeight}
          muteLabel={muteLabel}
          soloLabel={soloLabel}
          sendsLabel={sendsLabel}
          faderAria={faderAria(channel.name)}
          panAria={panAria(channel.name)}
          sendAriaFor={(sendName) => sendAria(channel.name, sendName)}
          onChange={onChannelChange}
          isMaster={false}
        />
      ))}
      {master !== undefined && (
        <>
          <div
            data-mol-id="audio-mixer-divider"
            aria-hidden="true"
            style={{
              width: 1,
              alignSelf: 'stretch',
              background: 'currentColor',
              opacity: 0.2,
              margin: '0 4px',
            }}
          />
          <ChannelStrip
            channel={master}
            faderHeight={faderHeight}
            muteLabel={muteLabel}
            soloLabel={soloLabel}
            sendsLabel={sendsLabel}
            faderAria={faderAria(master.name || masterLabel)}
            panAria={panAria(master.name || masterLabel)}
            sendAriaFor={(sendName) => sendAria(master.name || masterLabel, sendName)}
            onChange={onMasterChange}
            isMaster
          />
        </>
      )}
    </div>
  )
}

interface ChannelStripProps {
  channel: Channel
  faderHeight: number
  muteLabel: string
  soloLabel: string
  sendsLabel: string
  faderAria: string
  panAria: string
  sendAriaFor: (sendName: string) => string
  onChange?: (patch: ChannelChangePatch) => void
  isMaster: boolean
}

/**
 * Single channel column — name header, vertical fader, pan knob,
 * mute/solo buttons, optional sends row. Internal building block of
 * `<AudioMixer>`.
 *
 * @param props - Strip props.
 * @returns The channel-strip element.
 */
function ChannelStrip(props: ChannelStripProps) {
  const {
    channel,
    faderHeight,
    muteLabel,
    soloLabel,
    sendsLabel,
    faderAria,
    panAria,
    sendAriaFor,
    onChange,
    isMaster,
  } = props

  const cm = getClassMap()

  const stripStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    minWidth: 96,
    padding: 8,
    boxSizing: 'border-box',
  }

  const headerStyle: CSSProperties = {
    width: '100%',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderTop: channel.color ? `3px solid ${channel.color}` : undefined,
    paddingTop: channel.color ? 4 : 0,
  }

  // Vertical fader is implemented as a horizontal range input rotated
  // -90deg via CSS; this preserves native keyboard accessibility,
  // aria-valuenow/min/max, and pointer events while presenting as a
  // vertical column.
  const faderTrackStyle: CSSProperties = {
    width: faderHeight,
    height: 24,
    transform: 'rotate(-90deg)',
    transformOrigin: 'center',
  }
  const faderWrapStyle: CSSProperties = {
    height: faderHeight,
    width: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  /**
   * Handle the fader's onChange — emit a patch with the new clamped level.
   *
   * @param event - The range input change event.
   */
  function handleFader(event: ChangeEvent<HTMLInputElement>): void {
    const next = clampLevel(parseFloat(event.target.value))
    onChange?.({ id: channel.id, level: next })
  }

  /**
   * Handle the pan knob's onChange — emit a patch with the new clamped pan.
   *
   * @param event - The range input change event.
   */
  function handlePan(event: ChangeEvent<HTMLInputElement>): void {
    const next = clampPan(parseFloat(event.target.value))
    onChange?.({ id: channel.id, pan: next })
  }

  /**
   * Toggle mute and emit a patch.
   *
   * @param event - The button click event.
   */
  function handleMute(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    onChange?.({ id: channel.id, muted: !channel.muted })
  }

  /**
   * Toggle solo and emit a patch.
   *
   * @param event - The button click event.
   */
  function handleSolo(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    onChange?.({ id: channel.id, solo: !channel.solo })
  }

  /**
   * Handle a send-level change.
   *
   * @param sendId - Id of the send that moved.
   * @param event - The range input change event.
   */
  function handleSend(sendId: string, event: ChangeEvent<HTMLInputElement>): void {
    const next = clampLevel(parseFloat(event.target.value))
    onChange?.({ id: channel.id, sendId, sendLevel: next })
  }

  const buttonBase: CSSProperties = {
    minWidth: 36,
    minHeight: 28,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 4,
    border: '1px solid currentColor',
    background: 'transparent',
    color: 'inherit',
  }
  const buttonActive: CSSProperties = {
    background: 'currentColor',
    color: 'transparent',
  }

  const channelLevel = clampLevel(channel.level)
  const channelPan = clampPan(channel.pan)

  return (
    <div
      role="group"
      aria-label={channel.name}
      data-mol-id={isMaster ? 'audio-mixer-master-strip' : 'audio-mixer-channel-strip'}
      data-channel-id={channel.id}
      data-muted={channel.muted ? 'true' : 'false'}
      data-solo={channel.solo ? 'true' : 'false'}
      className={cm.cn()}
      style={stripStyle}
    >
      <div data-mol-id="audio-mixer-channel-name" style={headerStyle}>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{channel.name}</span>
      </div>

      <div style={faderWrapStyle}>
        <input
          type="range"
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          step={0.01}
          value={channelLevel}
          aria-label={faderAria}
          aria-valuemin={MIN_LEVEL}
          aria-valuemax={MAX_LEVEL}
          aria-valuenow={channelLevel}
          aria-orientation="vertical"
          data-mol-id={isMaster ? 'audio-mixer-master-fader' : 'audio-mixer-fader'}
          style={faderTrackStyle}
          onChange={handleFader}
        />
      </div>

      <input
        type="range"
        min={MIN_PAN}
        max={MAX_PAN}
        step={0.01}
        value={channelPan}
        aria-label={panAria}
        aria-valuemin={MIN_PAN}
        aria-valuemax={MAX_PAN}
        aria-valuenow={channelPan}
        data-mol-id="audio-mixer-pan"
        style={{ width: 64 }}
        onChange={handlePan}
      />

      <div data-mol-id="audio-mixer-buttons" style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          aria-label={muteLabel}
          aria-pressed={channel.muted ? 'true' : 'false'}
          data-mol-id="audio-mixer-mute"
          style={{ ...buttonBase, ...(channel.muted ? buttonActive : null) }}
          onClick={handleMute}
        >
          {muteLabel.charAt(0).toUpperCase()}
        </button>
        <button
          type="button"
          aria-label={soloLabel}
          aria-pressed={channel.solo ? 'true' : 'false'}
          data-mol-id="audio-mixer-solo"
          style={{ ...buttonBase, ...(channel.solo ? buttonActive : null) }}
          onClick={handleSolo}
        >
          {soloLabel.charAt(0).toUpperCase()}
        </button>
      </div>

      {!isMaster && channel.sends !== undefined && channel.sends.length > 0 && (
        <div
          data-mol-id="audio-mixer-sends"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '100%',
            paddingTop: 4,
            borderTop: '1px solid currentColor',
          }}
        >
          <span className={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7, textAlign: 'center' }}>
            {sendsLabel}
          </span>
          {channel.sends.map((send) => {
            const sendLevel = clampLevel(send.level)
            const sendName = send.label ?? send.id
            const sendNode: ReactNode = (
              <div
                key={send.id}
                data-mol-id="audio-mixer-send"
                data-send-id={send.id}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span
                  className={cm.cn(cm.textSize('xs'))}
                  style={{
                    flex: '0 0 32px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sendName}
                </span>
                <input
                  type="range"
                  min={MIN_LEVEL}
                  max={MAX_LEVEL}
                  step={0.01}
                  value={sendLevel}
                  aria-label={sendAriaFor(sendName)}
                  aria-valuemin={MIN_LEVEL}
                  aria-valuemax={MAX_LEVEL}
                  aria-valuenow={sendLevel}
                  data-mol-id="audio-mixer-send-fader"
                  style={{ flex: 1 }}
                  onChange={(event) => handleSend(send.id, event)}
                />
              </div>
            )
            return sendNode
          })}
        </div>
      )}
    </div>
  )
}
