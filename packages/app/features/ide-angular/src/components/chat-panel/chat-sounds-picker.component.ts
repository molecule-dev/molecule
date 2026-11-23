/**
 * React's section “Sounds picker popup” (ChatPanel.tsx lines 7312–7513): the
 * `/sounds` notification-sound picker above the composer.
 *
 * A header row carries “Notification sounds” and the ✕ close button. The
 * scrollable body lists an “All” row first (showing the shared mode, or
 * “mixed” when the events differ), then one row per sound event with its
 * localized label, its current mode badge and a one-line description. Clicking
 * any row cycles its mode (all rows at once for “All”) and persists the choice
 * on this device. The host IS React's popup `<div>`; while the picker is closed
 * React renders nothing, so the host is out of the DOM then (`useHostPresence`).
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { DEFAULT_AGENT_NAME, useHostPresence } from '@molecule/app-angular'
import {
  SOUND_EVENTS,
  soundEventDescription,
  soundEventLabel,
  type SoundEventType,
  type SoundMode,
  soundModeLabel,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatInnerState } from './chat-inner-state.js'
import { ChatSounds } from './chat-sounds.slice.js'

/** The header row's inline style. */
const HEADER_STYLE = styleText({
  padding: '5px 12px',
  borderBottom: '1px solid rgba(128,128,128,0.12)',
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})

/** The scrollable body's inline style. */
const LIST_STYLE = styleText({ overflowY: 'auto', flex: 1 })

/** The per-event row's inner top line's inline style. */
const EVENT_TOP_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

/** The per-event row's description's inline style. */
const DESC_STYLE = styleText({ fontSize: '11px', marginTop: '2px', opacity: 0.7 })

/**
 * The badge tints for a sound mode: green for always, amber for when-not-focused
 * (React's exact colors), a neutral grey for off, and the same grey for the
 * "mixed" aggregate.
 */
function badgeColor(mode: SoundMode | null): { bg: string; fg: string } {
  if (mode === 'always') return { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
  if (mode === 'whenNotFocused') return { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
  return { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
}

/**
 * React's “Sounds picker popup” section: the `/sounds` picker, or nothing while
 * it is closed.
 */
@Component({
  selector: 'div[mol-chat-sounds-picker]',
  standalone: true,
  host: {
    '[attr.class]': 'rootClass',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (picker(); as p) {<div [attr.class]="headerClass" [attr.style]="headerStyle"><span>{{ notificationSounds() }}</span><button type="button" (click)="close()" [attr.style]="closeStyle()">✕</button></div><div [attr.style]="listStyle"><button type="button" (click)="cycle('all')" (mouseenter)="rowEnter($event)" (mouseleave)="rowLeave($event, p.selectedIdx === 0)" [attr.class]="rowClass" [attr.style]="allRowStyle(p.selectedIdx === 0)"><span [attr.class]="levelClass">{{ allText() }}</span><span [attr.style]="allBadgeStyle()">{{ allModeLabel() }}</span></button>@for (event of soundEvents; track event; let idx = $index) {<button type="button" (click)="cycle(event)" (mouseenter)="rowEnter($event)" (mouseleave)="rowLeave($event, p.selectedIdx === idx + 1)" [attr.class]="rowClass" [attr.style]="eventRowStyle(p.selectedIdx === idx + 1)"><div [attr.style]="eventTopStyle"><span>{{ eventLabel(event) }}</span><span [attr.style]="eventBadgeStyle(event)">{{ eventModeLabel(event) }}</span></div><div [attr.class]="descClass" [attr.style]="descStyle">{{ eventDescription(event) }}</div></button>}</div>}`,
})
export class ChatSoundsPicker {
  /** The shared state, read for the env (the ClassMap, translator and viewport). */
  private readonly state = inject(ChatInnerState)

  /** The sounds slice: the open picker, the preference and its cycle writer. */
  private readonly sounds = inject(ChatSounds)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The popup's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The header row's ClassMap classes. */
  protected readonly headerClass: string

  /** A row's ClassMap classes. */
  protected readonly rowClass: string

  /** A row label's ClassMap classes. */
  protected readonly levelClass: string

  /** The description line's ClassMap classes. */
  protected readonly descClass: string

  /** The sound events the picker lists, in display order. */
  protected readonly soundEvents = SOUND_EVENTS

  /** The header row's inline style. */
  protected readonly headerStyle: string | null = HEADER_STYLE

  /** The scrollable body's inline style. */
  protected readonly listStyle: string | null = LIST_STYLE

  /** The per-event row's inner top line's inline style. */
  protected readonly eventTopStyle: string | null = EVENT_TOP_STYLE

  /** The per-event row's description's inline style. */
  protected readonly descStyle: string | null = DESC_STYLE

  /** Resolves the ClassMap and the static classes once, and keeps the host in the page only while open. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
    this.headerClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.rowClass = this.cm.w('full')
    this.levelClass = this.cm.fontWeight('medium')
    this.descClass = this.cm.textMuted
    useHostPresence(() => this.open())
  }

  /**
   * The open sounds picker's state, or `null` when it is closed.
   *
   * @returns React's `soundsPicker`.
   */
  protected picker(): ReturnType<ChatSounds['soundsPicker']> {
    return this.sounds.soundsPicker()
  }

  /**
   * Whether React renders the popup.
   *
   * @returns Whether the picker is open.
   */
  protected open(): boolean {
    return this.sounds.soundsPicker() !== null
  }

  /**
   * React's popup inline style, capped by the one popup height.
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 0,
      borderRadius: '6px 6px 0 0',
      zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: this.state.env.popupMaxHeight(),
    })
  }

  /**
   * The ✕ button's inline style, including the coarse-pointer touch floor.
   *
   * @returns The `style` attribute text.
   */
  protected closeStyle(): string | null {
    return styleText({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      fontSize: '14px',
      lineHeight: 1,
      opacity: 0.6,
      ...(this.state.env.isCoarse()
        ? {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            minHeight: 36,
          }
        : {}),
    })
  }

  /**
   * The "All" row's inline style.
   *
   * @param selected - Whether the row is highlighted.
   * @returns The `style` attribute text.
   */
  protected allRowStyle(selected: boolean): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '55px',
      padding: '8px 12px',
      border: 'none',
      borderBottom: '1px solid rgba(128,128,128,0.12)',
      cursor: 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      background: selected ? 'rgba(128,128,128,0.1)' : 'transparent',
    })
  }

  /**
   * A per-event row's inline style.
   *
   * @param selected - Whether the row is highlighted.
   * @returns The `style` attribute text.
   */
  protected eventRowStyle(selected: boolean): string | null {
    return styleText({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '55px',
      padding: '8px 12px 8px 24px',
      border: 'none',
      borderTop: '1px solid rgba(128,128,128,0.12)',
      cursor: 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      background: selected ? 'rgba(128,128,128,0.1)' : 'transparent',
    })
  }

  /**
   * The "All" row's badge style.
   *
   * @returns The `style` attribute text.
   */
  protected allBadgeStyle(): string | null {
    const color = badgeColor(this.allMode())
    return styleText({
      fontSize: '11px',
      background: color.bg,
      color: color.fg,
      padding: '1px 6px',
      borderRadius: '3px',
    })
  }

  /**
   * A per-event row's badge style.
   *
   * @param event - The sound event.
   * @returns The `style` attribute text.
   */
  protected eventBadgeStyle(event: SoundEventType): string | null {
    const color = badgeColor(this.sounds.soundsConfig()[event])
    return styleText({
      fontSize: '11px',
      background: color.bg,
      color: color.fg,
      padding: '1px 6px',
      borderRadius: '3px',
      flexShrink: 0,
    })
  }

  /**
   * The mode every event shares, or `null` when they differ (React's "All" row).
   *
   * @returns The shared mode, or `null` for mixed.
   */
  private allMode(): SoundMode | null {
    const config = this.sounds.soundsConfig()
    const allModes = SOUND_EVENTS.map((event) => config[event])
    const allSame = allModes.every((mode) => mode === allModes[0])
    return allSame ? allModes[0] : null
  }

  /**
   * The "All" row's mode label (the shared mode, or "mixed").
   *
   * @returns The label text.
   */
  protected allModeLabel(): string {
    void this.state.env.locale()
    const mode = this.allMode()
    return mode === null
      ? this.state.env.t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })
      : soundModeLabel(this.state.env.t, mode)
  }

  /**
   * The "All" row's label, translated.
   *
   * @returns The label text.
   */
  protected allText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.soundAll', undefined, { defaultValue: 'All' })
  }

  /**
   * The popup's title, translated.
   *
   * @returns The title text.
   */
  protected notificationSounds(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.notificationSounds', undefined, {
      defaultValue: 'Notification sounds',
    })
  }

  /**
   * A sound event's localized label.
   *
   * @param event - The sound event.
   * @returns The label text.
   */
  protected eventLabel(event: SoundEventType): string {
    void this.state.env.locale()
    return soundEventLabel(this.state.env.t, event)
  }

  /**
   * A sound event's current mode label.
   *
   * @param event - The sound event.
   * @returns The label text.
   */
  protected eventModeLabel(event: SoundEventType): string {
    void this.state.env.locale()
    return soundModeLabel(this.state.env.t, this.sounds.soundsConfig()[event])
  }

  /**
   * A sound event's localized one-line description.
   *
   * @param event - The sound event.
   * @returns The description text.
   */
  protected eventDescription(event: SoundEventType): string {
    void this.state.env.locale()
    return soundEventDescription(this.state.env.t, event, {
      agentName: this.state.props().agentName ?? DEFAULT_AGENT_NAME,
    })
  }

  /**
   * Cycles one row's mode (every event for `'all'`) and persists it.
   *
   * @param eventType - The sound event, or `'all'`.
   */
  protected cycle(eventType: SoundEventType | 'all'): void {
    void this.sounds.cycleSoundMode(eventType)
  }

  /** Closes the picker without changing the preference. */
  protected close(): void {
    this.sounds.setSoundsPicker(null)
  }

  /** Tints a hovered row (React writes the element's background directly). */
  protected rowEnter(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'rgba(128,128,128,0.15)'
  }

  /**
   * Restores a row's background to its selected/plain state on leave.
   *
   * @param event - The mouse-leave event.
   * @param selected - Whether the row is highlighted.
   */
  protected rowLeave(event: Event, selected: boolean): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = selected ? 'rgba(128,128,128,0.1)' : 'transparent'
  }
}
