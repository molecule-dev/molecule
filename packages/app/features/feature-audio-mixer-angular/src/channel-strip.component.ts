/**
 * ChannelStrip component (internal building block of the mixer, React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  type ElementRef,
  type QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { AudioMixerAccent } from './audio-mixer-accent.directive.js'
import type { Channel, ChannelChangePatch, Send } from './types.js'
import { clampLevel, clampPan, MAX_LEVEL, MAX_PAN, MIN_LEVEL, MIN_PAN } from './utilities.js'

/**
 * One channel column: name header, vertical fader, pan knob, mute/solo buttons,
 * optional sends row. The host IS the strip's `<div>` (`div[mol-audio-mixer-strip]`),
 * matching React's `ChannelStrip` root exactly. Not exported: consumers use
 * `AudioMixer`.
 */
@Component({
  selector: 'div[mol-audio-mixer-strip]',
  standalone: true,
  imports: [AudioMixerAccent],
  inputs: [
    'channel',
    'faderHeight',
    'muteLabel',
    'soloLabel',
    'muteInitial',
    'soloInitial',
    'sendsLabel',
    'labelName',
    'onChange',
    'isMaster',
  ],
  host: {
    role: 'group',
    '[attr.aria-label]': 'channel?.name',
    '[attr.data-mol-id]': "isMaster ? 'audio-mixer-master-strip' : 'audio-mixer-channel-strip'",
    '[attr.data-channel-id]': 'channel?.id',
    '[attr.data-muted]': 'channel?.muted ? "true" : "false"',
    '[attr.data-solo]': 'channel?.solo ? "true" : "false"',
    '[class]': 'stripClasses()',
    style:
      'display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 96px; padding: 8px; box-sizing: border-box',
  },
  template: `<div
      data-mol-id="audio-mixer-channel-name"
      style="width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
      [molAudioMixerAccent]="channel?.color ?? null"
      [style.padding-top]="channel?.color ? '4px' : '0px'"
    >
      <span [class]="nameClasses()">{{ channel?.name }}</span>
    </div>
    <div
      style="height: {{
        faderHeight
      }}px; width: 32px; display: flex; align-items: center; justify-content: center"
    >
      <input
        #fader
        type="range"
        [attr.min]="minLevel"
        [attr.max]="maxLevel"
        [attr.step]="0.01"
        [attr.value]="channelLevel()"
        [attr.aria-label]="faderAria()"
        [attr.aria-valuemin]="minLevel"
        [attr.aria-valuemax]="maxLevel"
        [attr.aria-valuenow]="channelLevel()"
        aria-orientation="vertical"
        [attr.data-mol-id]="isMaster ? 'audio-mixer-master-fader' : 'audio-mixer-fader'"
        style="width: {{
          faderHeight
        }}px; height: 24px; transform: rotate(-90deg); transform-origin: center"
        (input)="handleFader($event)"
      />
    </div>
    <input
      #pan
      type="range"
      [attr.min]="minPan"
      [attr.max]="maxPan"
      [attr.step]="0.01"
      [attr.value]="channelPan()"
      [attr.aria-label]="panAria()"
      [attr.aria-valuemin]="minPan"
      [attr.aria-valuemax]="maxPan"
      [attr.aria-valuenow]="channelPan()"
      data-mol-id="audio-mixer-pan"
      style="width: 64px"
      (input)="handlePan($event)"
    />
    <div data-mol-id="audio-mixer-buttons" style="display: flex; gap: 4px">
      <button
        type="button"
        [attr.aria-label]="muteLabel"
        [attr.aria-pressed]="channel?.muted ? 'true' : 'false'"
        data-mol-id="audio-mixer-mute"
        [class]="toggleClass(channel?.muted === true)"
        (click)="handleMute($event)"
      >
        {{ muteInitial }}
      </button>
      <button
        type="button"
        [attr.aria-label]="soloLabel"
        [attr.aria-pressed]="channel?.solo ? 'true' : 'false'"
        data-mol-id="audio-mixer-solo"
        [class]="toggleClass(channel?.solo === true)"
        (click)="handleSolo($event)"
      >
        {{ soloInitial }}
      </button>
    </div>
    @if (!isMaster && hasSends()) {
      <div
        data-mol-id="audio-mixer-sends"
        style="display: flex; flex-direction: column; gap: 4px; width: 100%; padding-top: 4px; border-top: 1px solid"
      >
        <span [class]="smallTextClasses()" style="opacity: 0.7; text-align: center">{{
          sendsLabel
        }}</span>
        @for (send of channel?.sends ?? []; track send.id) {
          <div
            data-mol-id="audio-mixer-send"
            [attr.data-send-id]="send.id"
            style="display: flex; align-items: center; gap: 4px"
          >
            <span
              [class]="smallTextClasses()"
              style="flex: 0 0 32px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >{{ sendName(send) }}</span
            >
            <input
              #sendFader
              type="range"
              [attr.min]="minLevel"
              [attr.max]="maxLevel"
              [attr.step]="0.01"
              [attr.value]="sendLevel(send)"
              [attr.aria-label]="sendAria(send)"
              [attr.aria-valuemin]="minLevel"
              [attr.aria-valuemax]="maxLevel"
              [attr.aria-valuenow]="sendLevel(send)"
              data-mol-id="audio-mixer-send-fader"
              style="flex: 1 1 0%"
              (input)="handleSend(send, $event)"
            />
          </div>
        }
      </div>
    }`,
})
export class ChannelStrip implements AfterViewChecked {
  /** The channel (or master channel) this strip shows. */
  channel?: Channel
  /** Pixel height of the fader column. */
  faderHeight = 180
  /** Translated mute button label. */
  muteLabel = ''
  /** Translated solo button label. */
  soloLabel = ''
  /** Translated letter the mute button shows (`audioMixer.button.muteInitial`). */
  muteInitial = ''
  /** Translated letter the solo button shows (`audioMixer.button.soloInitial`). */
  soloInitial = ''
  /** Translated sends row label. */
  sendsLabel = ''
  /** Channel name the fader/pan/send labels are built from. */
  labelName = ''
  /** Receives every patch this strip emits. */
  onChange?: (patch: ChannelChangePatch) => void
  /** Whether this strip is the master column. */
  isMaster = false

  /** Minimum allowed fader level. */
  readonly minLevel = MIN_LEVEL
  /** Maximum allowed fader level. */
  readonly maxLevel = MAX_LEVEL
  /** Minimum allowed pan position. */
  readonly minPan = MIN_PAN
  /** Maximum allowed pan position. */
  readonly maxPan = MAX_PAN

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The fader input, whose live value React keeps on the prop. */
  @ViewChild('fader') private faderRef?: ElementRef<HTMLInputElement>
  /** The pan knob, whose live value React keeps on the prop. */
  @ViewChild('pan') private panRef?: ElementRef<HTMLInputElement>
  /** The send faders, in render order. */
  @ViewChildren('sendFader') private sendRefs?: QueryList<ElementRef<HTMLInputElement>>

  /**
   * Re-applies React's controlled `value` to the live range inputs after every
   * change-detection cycle. Angular writes a property binding before the
   * element's `min`/`max` attributes in some orders (a negative pan reads as
   * `0`), so the value is set here, once every binding is applied.
   */
  ngAfterViewChecked(): void {
    this.syncInput(this.faderRef, this.channelLevel())
    this.syncInput(this.panRef, this.channelPan())
    const sends = this.channel?.sends ?? []
    this.sendRefs?.forEach((ref, index) => {
      const send = sends[index]
      if (send) this.syncInput(ref, clampLevel(send.level))
    })
  }

  /**
   * Writes one controlled value onto a range input's live property, leaving the
   * `value` attribute (React's `defaultValue`) as the template set it.
   *
   * @param ref - The input's element reference, when the input is rendered.
   * @param value - The controlled value.
   */
  private syncInput(ref: ElementRef<HTMLInputElement> | undefined, value: number): void {
    const element = ref?.nativeElement
    const text = String(value)
    if (element && element.value !== text) element.value = text
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (React's `cm.cn()`).
   * @returns The class string.
   */
  stripClasses(): string {
    return this.cm().cn()
  }

  /**
   * The name span's class list.
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The small-label class list (sends row and send names).
   * @returns The class string.
   */
  smallTextClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Classes for a strip toggle (mute / solo): solid when engaged, outline idle.
   * @param engaged - Whether the toggle is currently on.
   * @returns The resolved class string.
   */
  toggleClass(engaged: boolean): string {
    return this.cm().cn(
      engaged
        ? this.cm().button({ variant: 'solid', color: 'primary', size: 'xs' })
        : this.cm().button({ variant: 'outline', size: 'xs' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The fader's clamped level (React's `clampLevel(channel.level)`).
   * @returns The controlled fader value.
   */
  channelLevel(): number {
    return clampLevel(this.channel?.level ?? 0)
  }

  /**
   * The pan knob's clamped pan (React's `clampPan(channel.pan)`).
   * @returns The controlled pan value.
   */
  channelPan(): number {
    return clampPan(this.channel?.pan ?? 0)
  }

  /**
   * One send's clamped level.
   * @param send - The send.
   * @returns The controlled send value.
   */
  sendLevel(send: Send): number {
    return clampLevel(send.level)
  }

  /**
   * A send's display name: its label, or its id when unlabelled.
   * @param send - The send.
   * @returns The displayed name.
   */
  sendName(send: Send): string {
    return send.label ?? send.id
  }

  /**
   * Whether the sends row renders (React's `!isMaster && sends.length > 0`).
   * @returns True when the row renders.
   */
  hasSends(): boolean {
    return (this.channel?.sends?.length ?? 0) > 0
  }

  /**
   * The fader's accessible label (`{{name}} fader`).
   * @returns The translated label.
   */
  faderAria(): string {
    return this.i18n.t(
      'audioMixer.aria.fader',
      { name: this.labelName },
      { defaultValue: '{{name}} fader' },
    )
  }

  /**
   * The pan knob's accessible label (`{{name}} pan`).
   * @returns The translated label.
   */
  panAria(): string {
    return this.i18n.t(
      'audioMixer.aria.pan',
      { name: this.labelName },
      { defaultValue: '{{name}} pan' },
    )
  }

  /**
   * A send fader's accessible label (`{{channel}} send to {{send}}`).
   * @param send - The send.
   * @returns The translated label.
   */
  sendAria(send: Send): string {
    return this.i18n.t(
      'audioMixer.aria.send',
      { channel: this.labelName, send: this.sendName(send) },
      { defaultValue: '{{channel}} send to {{send}}' },
    )
  }

  /**
   * Emit a fader patch with the new clamped level, then restore the controlled
   * value as React restores a controlled input.
   * @param event - The range input's native input event.
   */
  handleFader(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onChange?.({ id: this.channel?.id ?? '', level: clampLevel(parseFloat(element.value)) })
    element.value = String(this.channelLevel())
  }

  /**
   * Emit a pan patch with the new clamped pan, then restore the controlled value.
   * @param event - The range input's native input event.
   */
  handlePan(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onChange?.({ id: this.channel?.id ?? '', pan: clampPan(parseFloat(element.value)) })
    element.value = String(this.channelPan())
  }

  /**
   * Toggle mute and emit a patch.
   * @param event - The button click event.
   */
  handleMute(event: MouseEvent): void {
    event.preventDefault()
    this.onChange?.({ id: this.channel?.id ?? '', muted: !this.channel?.muted })
  }

  /**
   * Toggle solo and emit a patch.
   * @param event - The button click event.
   */
  handleSolo(event: MouseEvent): void {
    event.preventDefault()
    this.onChange?.({ id: this.channel?.id ?? '', solo: !this.channel?.solo })
  }

  /**
   * Emit a send patch for the send that moved, then restore its controlled value.
   * @param send - The send that moved.
   * @param event - The range input's native input event.
   */
  handleSend(send: Send, event: Event): void {
    const element = event.target as HTMLInputElement
    this.onChange?.({
      id: this.channel?.id ?? '',
      sendId: send.id,
      sendLevel: clampLevel(parseFloat(element.value)),
    })
    element.value = String(this.sendLevel(send))
  }
}
