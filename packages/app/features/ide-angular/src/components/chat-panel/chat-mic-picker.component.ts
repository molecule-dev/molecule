/**
 * React's section “Dictation engine picker (/mic)” (ChatPanel.tsx lines
 * 6059–6269): the popup that lets the user choose which dictation engine to use
 * (and download), mirroring locked models in the `/model` picker.
 *
 * One row per registered engine showing its kind, download size, accuracy and
 * language coverage; engines this browser or the UI language cannot run are
 * disabled with the reason shown. The host element IS React's popup `<div>`, so
 * the port adds no node; while the picker is closed React renders nothing, so
 * the host is out of the DOM then (`useHostPresence`).
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import { useHostPresence } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatInnerState } from './chat-inner-state.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The header row's inline style. */
const HEADER_STYLE = styleText({
  padding: '8px 12px',
  borderBottom: '1px solid rgba(128,128,128,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
})

/** The title line's inline style. */
const TITLE_STYLE = styleText({ fontSize: '13px' })

/** The privacy line's inline style. */
const PRIVACY_STYLE = styleText({ fontSize: '11px' })

/** A row's inner top line's inline style. */
const ROW_TOP_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
})

/** The engine label's inline style. */
const LABEL_STYLE = styleText({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

/** The spacer that pushes the badges to the right. */
const SPACER_STYLE = styleText({ flex: 1 })

/** The size / accuracy / language line's inline style. */
const META_STYLE = styleText({ fontSize: '11px' })

/**
 * Localizes an engine's language coverage names through the browser's
 * `Intl.DisplayNames`, falling back to the bare codes when it is unavailable
 * or the locale is odd.
 *
 * @param languages - The engine's non-`'all'` coverage (ISO 639-1 codes).
 * @returns The localized names, in the engine's order.
 */
function localizeLanguageNames(languages: readonly string[]): string[] {
  try {
    const displayNames = new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' })
    return languages.map((code) => displayNames.of(code) ?? code)
  } catch (_error) {
    // Intl.DisplayNames unavailable/odd locale — fall back to codes
    return [...languages]
  }
}

/**
 * React's “Dictation engine picker (/mic)” section: the engine picker popup, or
 * nothing while it is closed.
 */
@Component({
  selector: 'div[mol-chat-mic-picker]',
  standalone: true,
  host: {
    '[attr.class]': 'rootClass',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (open()) {<div [attr.style]="headerStyle"><span [attr.class]="titleClass" [attr.style]="titleStyle">{{ titleText() }}</span><span [attr.class]="mutedClass" [attr.style]="privacyStyle">{{ privacyText() }}</span></div>@for (def of engines(); track def.id) {<button type="button" [attr.data-mol-id]="'chat-mic-engine-' + def.id" (click)="choose(def)" (mouseenter)="rowEnter($event, def)" (mouseleave)="rowLeave($event)" [attr.class]="rowClass" [attr.style]="rowStyle(def)"><div [attr.style]="rowTopStyle"><span [attr.class]="titleClass" [attr.style]="labelStyle">{{ def.label }}</span><span [attr.style]="kindStyle()">{{ kindLabel(def) }}</span><span [attr.style]="spacerStyle"></span>@if (isCurrent(def)) {<span [attr.style]="currentStyle()">{{ currentText() }}</span>}@if (reasonLabel(def); as label) {<span [attr.style]="reasonStyle()">{{ label }}</span>}</div><span [attr.class]="mutedClass" [attr.style]="metaStyle" [attr.title]="languagesTitle(def)">{{ sizeLabel(def) }} · {{ accuracyLabel(def) }} · {{ languagesLabel(def) }}</span></button>}}`,
})
export class ChatMicPicker {
  /** The shared state, read for the env (the ClassMap, translator and viewport). */
  private readonly state = inject(ChatInnerState)

  /** The voice slice: the open picker, the catalog and the engine actions. */
  private readonly voice = inject(ChatVoice)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The popup's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The title line's ClassMap classes. */
  protected readonly titleClass: string

  /** The muted lines' ClassMap classes. */
  protected readonly mutedClass: string

  /** A row's ClassMap classes. */
  protected readonly rowClass: string

  /** The header row's inline style. */
  protected readonly headerStyle: string | null = HEADER_STYLE

  /** The title line's inline style. */
  protected readonly titleStyle: string | null = TITLE_STYLE

  /** The privacy line's inline style. */
  protected readonly privacyStyle: string | null = PRIVACY_STYLE

  /** A row's inner top line's inline style. */
  protected readonly rowTopStyle: string | null = ROW_TOP_STYLE

  /** The engine label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** The spacer that pushes the badges to the right. */
  protected readonly spacerStyle: string | null = SPACER_STYLE

  /** The size / accuracy / language line's inline style. */
  protected readonly metaStyle: string | null = META_STYLE

  /** Resolves the ClassMap and the static classes once, and keeps the host in the page only while open. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
    this.titleClass = this.cm.fontWeight('medium')
    this.mutedClass = this.cm.textMuted
    this.rowClass = this.cm.w('full')
    useHostPresence(() => this.open())
  }

  /**
   * Whether React renders the picker.
   *
   * @returns Whether the picker is open and a catalog is registered.
   */
  protected open(): boolean {
    return this.voice.micPicker() !== null && this.voice.voiceEngines().length > 0
  }

  /**
   * The registered dictation engines, in display order.
   *
   * @returns The engine catalog.
   */
  protected engines(): readonly VoiceEngineDef[] {
    return this.voice.voiceEngines()
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
      overflowY: 'auto',
    })
  }

  /**
   * The popup's title, translated.
   *
   * @returns The title text.
   */
  protected titleText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.voiceEngineTitle', undefined, {
      defaultValue: 'Dictation engine',
    })
  }

  /**
   * The popup's privacy line, translated.
   *
   * @returns The privacy text.
   */
  protected privacyText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.voiceEnginePrivacy', undefined, {
      defaultValue: 'Every option runs on your device — audio never leaves your browser.',
    })
  }

  /**
   * The “current” badge's label, translated.
   *
   * @returns The badge text.
   */
  protected currentText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.voiceEngineCurrent', undefined, { defaultValue: 'current' })
  }

  /**
   * Whether this engine is the chosen one (its row shows the “current” badge).
   *
   * @param definition - The engine.
   * @returns Whether it is the chosen engine.
   */
  protected isCurrent(definition: VoiceEngineDef): boolean {
    return this.voice.currentVoiceEngineId() === definition.id
  }

  /**
   * Why this engine cannot be used here, or `null` when it can.
   *
   * @param definition - The engine.
   * @returns The reason, or null.
   */
  protected reason(definition: VoiceEngineDef): 'browser' | 'language' | null {
    return this.voice.voiceEngineDisabledReason(definition)
  }

  /**
   * The reason badge's label, translated, or `null` when the engine is usable.
   *
   * @param definition - The engine.
   * @returns The label, or null.
   */
  protected reasonLabel(definition: VoiceEngineDef): string | null {
    void this.state.env.locale()
    const reason = this.reason(definition)
    if (reason === 'browser') {
      return this.state.env.t('ide.chat.voiceEngineNoBrowserSupport', undefined, {
        defaultValue: 'not available in this browser',
      })
    }
    if (reason === 'language') {
      return this.state.env.t('ide.chat.voiceEngineNoLanguageSupport', undefined, {
        defaultValue: 'not available for your language',
      })
    }
    return null
  }

  /**
   * An engine's kind label, translated.
   *
   * @param definition - The engine.
   * @returns The label text.
   */
  protected kindLabel(definition: VoiceEngineDef): string {
    void this.state.env.locale()
    return definition.kind === 'native'
      ? this.state.env.t('ide.chat.voiceEngineNative', undefined, {
          defaultValue: 'browser native',
        })
      : this.state.env.t('ide.chat.voiceEngineOnDevice', undefined, { defaultValue: 'on-device' })
  }

  /**
   * A row's size label: no download, one figure, or a range.
   *
   * @param definition - The engine.
   * @returns The localized label.
   */
  protected sizeLabel(definition: VoiceEngineDef): string {
    void this.state.env.locale()
    const download = definition.downloadMB
    return download === undefined
      ? this.state.env.t('ide.chat.voiceEngineNoDownload', undefined, {
          defaultValue: 'no download',
        })
      : typeof download === 'number'
        ? this.state.env.t(
            'ide.chat.voiceEngineDownload',
            { mb: download },
            { defaultValue: '~{{mb}} MB download, then cached' },
          )
        : this.state.env.t(
            'ide.chat.voiceEngineDownloadRange',
            { min: download[0], max: download[1] },
            { defaultValue: '~{{min}}–{{max}} MB download, then cached' },
          )
  }

  /**
   * A row's accuracy label.
   *
   * @param definition - The engine.
   * @returns The localized label.
   */
  protected accuracyLabel(definition: VoiceEngineDef): string {
    void this.state.env.locale()
    return definition.accuracy === 3
      ? this.state.env.t('ide.chat.voiceAccuracyBest', undefined, { defaultValue: 'best accuracy' })
      : definition.accuracy === 2
        ? this.state.env.t('ide.chat.voiceAccuracyGood', undefined, {
            defaultValue: 'good accuracy',
          })
        : this.state.env.t('ide.chat.voiceAccuracyBasic', undefined, {
            defaultValue: 'basic accuracy',
          })
  }

  /**
   * A row's language label: all languages, one language, or a count.
   *
   * @param definition - The engine.
   * @returns The localized label.
   */
  protected languagesLabel(definition: VoiceEngineDef): string {
    void this.state.env.locale()
    if (definition.languages === 'all') {
      return this.state.env.t('ide.chat.voiceLangsAll', undefined, {
        defaultValue: 'all languages',
      })
    }
    const names = localizeLanguageNames(definition.languages)
    return names.length === 1
      ? this.state.env.t(
          'ide.chat.voiceLangOnly',
          { language: names[0] },
          { defaultValue: '{{language}} only' },
        )
      : this.state.env.t(
          'ide.chat.voiceLangsCount',
          { count: names.length },
          { defaultValue: '{{count}} languages' },
        )
  }

  /**
   * The full language list shown on hover (multi-language engines only).
   *
   * @param definition - The engine.
   * @returns The joined names, or undefined.
   */
  protected languagesTitle(definition: VoiceEngineDef): string | undefined {
    if (definition.languages === 'all') return undefined
    const names = localizeLanguageNames(definition.languages)
    return names.length > 1 ? names.join(', ') : undefined
  }

  /**
   * A row's inline style, including its disabled treatment.
   *
   * @param definition - The engine.
   * @returns The `style` attribute text.
   */
  protected rowStyle(definition: VoiceEngineDef): string | null {
    const disabled = this.reason(definition) !== null
    return styleText({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '2px',
      padding: '8px 12px',
      border: 'none',
      borderTop: '1px solid rgba(128,128,128,0.12)',
      cursor: disabled ? 'default' : 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      opacity: disabled ? 0.45 : 1,
      background: 'transparent',
    })
  }

  /**
   * The kind badge's inline style (the green pill).
   *
   * @returns The `style` attribute text.
   */
  protected kindStyle(): string | null {
    const isLight = this.state.env.isLight()
    return styleText({
      fontSize: '10px',
      padding: '1px 5px',
      borderRadius: 3,
      flexShrink: 0,
      background: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
      color: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)',
    })
  }

  /**
   * The “current” badge's inline style (the blue pill).
   *
   * @returns The `style` attribute text.
   */
  protected currentStyle(): string | null {
    const isLight = this.state.env.isLight()
    return styleText({
      fontSize: '10px',
      padding: '1px 5px',
      borderRadius: 3,
      flexShrink: 0,
      background: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
      color: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)',
    })
  }

  /**
   * The reason badge's inline style (the red pill).
   *
   * @returns The `style` attribute text.
   */
  protected reasonStyle(): string | null {
    const isLight = this.state.env.isLight()
    return styleText({
      fontSize: '10px',
      padding: '1px 5px',
      borderRadius: 3,
      flexShrink: 0,
      background: isLight ? 'rgba(220,38,38,0.10)' : 'rgba(248,113,113,0.15)',
      color: isLight ? 'rgb(220,38,38)' : 'rgb(248,113,113)',
    })
  }

  /**
   * Applies a row's choice; a disabled row ignores the click.
   *
   * @param definition - The engine.
   */
  protected choose(definition: VoiceEngineDef): void {
    if (this.reason(definition) !== null) return
    this.voice.chooseVoiceEngine(definition, this.voice.micPicker()?.autoStart ?? false)
  }

  /**
   * Tints a hovered usable row (React writes the element's background
   * directly, bypassing the style declaration).
   *
   * @param event - The mouse-enter event.
   * @param definition - The row's engine.
   */
  protected rowEnter(event: Event, definition: VoiceEngineDef): void {
    if (this.reason(definition) !== null) return
    const element = event.currentTarget as HTMLElement
    element.style.background = 'rgba(128,128,128,0.15)'
  }

  /**
   * Restores a row's background when the pointer leaves it, disabled or not.
   *
   * @param event - The mouse-leave event.
   */
  protected rowLeave(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'transparent'
  }
}
