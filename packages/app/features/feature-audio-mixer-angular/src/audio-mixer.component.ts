/**
 * AudioMixer component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ChannelStrip } from './channel-strip.component.js'
import type { Channel, ChannelChangePatch } from './types.js'

/**
 * AudioMixer component.
 *
 * Multi-channel mixer console: one column per channel — name, vertical fader,
 * pan knob, mute/solo buttons, optional sends row — plus an optional master
 * column. The host IS the root `<div>` (`div[mol-audio-mixer]`), matching
 * React's root exactly (`role`, `aria-label`, `data-mol-id` and the root style
 * live on it).
 *
 * Styling routes through `getClassMap()` and all user-visible text routes
 * through `t()` via the companion locale bond
 * `@molecule/app-locales-feature-audio-mixer`. Pure UI; the caller wires the
 * emitted change patches back to whatever audio engine they want.
 */
@Component({
  selector: 'div[mol-audio-mixer]',
  standalone: true,
  imports: [ChannelStrip],
  inputs: ['channels', 'onChannelChange', 'master', 'onMasterChange', 'faderHeight', 'className'],
  host: {
    role: 'group',
    '[attr.aria-label]': 'consoleLabel()',
    '[attr.data-mol-id]': "'audio-mixer'",
    '[class]': 'rootClasses()',
    style: 'display: flex; align-items: stretch; gap: 8px; overflow-x: auto; user-select: none',
  },
  template: `@for (channel of channels; track channel.id) {
      <div
        mol-audio-mixer-strip
        [channel]="channel"
        [faderHeight]="faderHeight ?? 180"
        [muteLabel]="muteLabel()"
        [soloLabel]="soloLabel()"
        [muteInitial]="muteInitial()"
        [soloInitial]="soloInitial()"
        [sendsLabel]="sendsLabel()"
        [labelName]="channel.name"
        [onChange]="onChannelChange"
        [isMaster]="false"
      ></div>
    }
    @if (master !== undefined) {
      <div
        data-mol-id="audio-mixer-divider"
        aria-hidden="true"
        style="width: 1px; align-self: stretch; background: currentcolor; opacity: 0.2; margin: 0px 4px"
      ></div>
      <div
        mol-audio-mixer-strip
        [channel]="master"
        [faderHeight]="faderHeight ?? 180"
        [muteLabel]="muteLabel()"
        [soloLabel]="soloLabel()"
        [muteInitial]="muteInitial()"
        [soloInitial]="soloInitial()"
        [sendsLabel]="sendsLabel()"
        [labelName]="master.name || masterLabel()"
        [onChange]="onMasterChange"
        [isMaster]="true"
      ></div>
    }`,
})
export class AudioMixer {
  /** Channels rendered as columns from left to right. Order is preserved. */
  channels: Channel[] = []
  /** Called for every user-initiated channel change. */
  onChannelChange?: (patch: ChannelChangePatch) => void
  /** Optional master channel, rendered as a final, visually-separated column. */
  master?: Channel
  /** Called when the master channel changes (only fires when `master` is supplied). */
  onMasterChange?: (patch: ChannelChangePatch) => void
  /** Pixel height of the fader column (defaults to 180 at read time). */
  faderHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (`cm.cn(className)`).
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The console's accessible name (`audioMixer.aria.console`).
   * @returns The translated label.
   */
  consoleLabel(): string {
    return this.i18n.t('audioMixer.aria.console', {}, { defaultValue: 'Audio mixer console' })
  }

  /**
   * The master channel's fallback name (`audioMixer.master`).
   * @returns The translated label.
   */
  masterLabel(): string {
    return this.i18n.t('audioMixer.master', {}, { defaultValue: 'Master' })
  }

  /**
   * The mute button's label (`audioMixer.button.mute`).
   * @returns The translated label.
   */
  muteLabel(): string {
    return this.i18n.t('audioMixer.button.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The solo button's label (`audioMixer.button.solo`).
   * @returns The translated label.
   */
  soloLabel(): string {
    return this.i18n.t('audioMixer.button.solo', {}, { defaultValue: 'Solo' })
  }

  /**
   * The letter the mute button shows (`audioMixer.button.muteInitial`) — a
   * locale's own key, not the label's `charAt(0)`, which under a translated
   * label is an arbitrary slice of that string (and under en-XA a lone `⟦`).
   * @returns The translated letter.
   */
  muteInitial(): string {
    return this.i18n.t('audioMixer.button.muteInitial', {}, { defaultValue: 'M' })
  }

  /**
   * The letter the solo button shows (`audioMixer.button.soloInitial`).
   * @returns The translated letter.
   */
  soloInitial(): string {
    return this.i18n.t('audioMixer.button.soloInitial', {}, { defaultValue: 'S' })
  }

  /**
   * The sends row's label (`audioMixer.sends`).
   * @returns The translated label.
   */
  sendsLabel(): string {
    return this.i18n.t('audioMixer.sends', {}, { defaultValue: 'Sends' })
  }
}
