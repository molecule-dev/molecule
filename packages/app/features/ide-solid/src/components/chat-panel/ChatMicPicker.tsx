/**
 * The dictation engine picker (`/mic`) — React's render section “Dictation
 * engine picker (/mic)”, mirroring locked models in the `/model` picker.
 *
 * When the app registers a voice-engine catalog, the user chooses which engine
 * to use (and download): on the first mic click, or anytime via `/mic`. Each row
 * names the engine, how it runs, its download, accuracy and language coverage;
 * an engine this browser or the UI language cannot use renders disabled with
 * the reason, and the chosen engine carries the "current" pill.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'

import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import type { DictationEngineDisabledReason } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx } from './context.js'

/**
 * Keeps every inline declaration on the CSSOM path.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background` serialize differently, and jsdom's
 * raw-text parser can drop a declaration entirely. Calling through this
 * identity function keeps every declaration on the CSSOM path, so the rendered
 * `style` attribute is the one React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatMicPicker}. */
export interface ChatMicPickerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * The tinted pill of one row badge, chosen by the active theme.
 * @param ctx - The inner ctx (its `isLight` accessor picks the tint).
 * @param light - The light theme's colors.
 * @param dark - The dark theme's colors.
 * @returns The badge's background and text colors.
 */
function badgeStyle(
  ctx: ChatInnerCtx,
  light: { background: string; color: string },
  dark: { background: string; color: string },
): JSX.CSSProperties {
  const tint = ctx.env.isLight() ? light : dark
  return {
    'font-size': '10px',
    padding: '1px 5px',
    'border-radius': '3px',
    'flex-shrink': '0',
    background: tint.background,
    color: tint.color,
  }
}

/** The one row of the engine list and the values its render reads. */
interface EngineRowProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
  /** The engine this row describes. */
  def: VoiceEngineDef
  /** Whether a mic click (rather than `/mic`) opened the picker. */
  autoStart: boolean
}

/**
 * One engine row of the dictation-engine picker.
 * @param props - The inner ctx, the engine and whether a choice starts dictating.
 * @returns The row.
 */
function EngineRow(props: EngineRowProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env
  const def = props.def

  /**
   * Why this engine cannot be used here, or null when it can.
   * @returns The reason, or null.
   */
  const reason = (): DictationEngineDisabledReason => ctx.voice.voiceEngineDisabledReason(def)

  /**
   * Whether this engine is unusable here.
   * @returns True when the engine is disabled.
   */
  const disabled = (): boolean => reason() !== null

  /**
   * Whether this row is the user's current choice.
   * @returns True for the chosen engine.
   */
  const isCurrent = (): boolean => ctx.voice.currentVoiceEngineId() === def.id

  /**
   * The engine's language names, localized through the browser's
   * `Intl.DisplayNames`; an empty list for an engine that covers every language.
   * @returns The display names (or codes) of the covered languages.
   */
  const languageNames = (): string[] => {
    if (def.languages === 'all') return []
    try {
      const displayNames = new Intl.DisplayNames([navigator.language || 'en'], {
        type: 'language',
      })
      return def.languages.map((code) => displayNames.of(code) ?? code)
    } catch (_error) {
      // Intl.DisplayNames unavailable/odd locale — fall back to codes
      return [...def.languages]
    }
  }

  /**
   * The engine's download size line.
   * @returns The translated download label.
   */
  const sizeLabel = (): string => {
    const download = def.downloadMB
    if (download === undefined)
      return t('ide.chat.voiceEngineNoDownload', undefined, { defaultValue: 'no download' })
    if (typeof download === 'number')
      return t(
        'ide.chat.voiceEngineDownload',
        { mb: download },
        { defaultValue: '~{{mb}} MB download, then cached' },
      )
    return t(
      'ide.chat.voiceEngineDownloadRange',
      { min: download[0], max: download[1] },
      { defaultValue: '~{{min}}–{{max}} MB download, then cached' },
    )
  }

  /**
   * The engine's accuracy line.
   * @returns The translated accuracy label.
   */
  const accuracyLabel = (): string =>
    def.accuracy === 3
      ? t('ide.chat.voiceAccuracyBest', undefined, { defaultValue: 'best accuracy' })
      : def.accuracy === 2
        ? t('ide.chat.voiceAccuracyGood', undefined, { defaultValue: 'good accuracy' })
        : t('ide.chat.voiceAccuracyBasic', undefined, { defaultValue: 'basic accuracy' })

  /**
   * The engine's language-coverage line.
   * @returns The translated language label.
   */
  const languagesLabel = (): string => {
    if (def.languages === 'all')
      return t('ide.chat.voiceLangsAll', undefined, { defaultValue: 'all languages' })
    const names = languageNames()
    return names.length === 1
      ? t('ide.chat.voiceLangOnly', { language: names[0] }, { defaultValue: '{{language}} only' })
      : t(
          'ide.chat.voiceLangsCount',
          { count: names.length },
          { defaultValue: '{{count}} languages' },
        )
  }

  /**
   * The full language list shown on hover for multi-language engines.
   * @returns The joined language names, or undefined for one or none.
   */
  const languagesTitle = (): string | undefined => {
    const names = languageNames()
    return names.length > 1 ? names.join(', ') : undefined
  }

  /**
   * How the engine runs (the green kind pill).
   * @returns The translated kind label.
   */
  const kindLabel = (): string =>
    def.kind === 'native'
      ? t('ide.chat.voiceEngineNative', undefined, { defaultValue: 'browser native' })
      : t('ide.chat.voiceEngineOnDevice', undefined, { defaultValue: 'on-device' })

  /**
   * Why this engine is unusable (the red reason pill), or null.
   * @returns The translated reason, or null when the engine can be used.
   */
  const reasonLabel = (): string | null => {
    const current = reason()
    if (current === 'browser')
      return t('ide.chat.voiceEngineNoBrowserSupport', undefined, {
        defaultValue: 'not available in this browser',
      })
    if (current === 'language')
      return t('ide.chat.voiceEngineNoLanguageSupport', undefined, {
        defaultValue: 'not available for your language',
      })
    return null
  }

  return (
    <button
      /* mol-bespoke-button: dictation engine row — full-width list item in the /mic popup */
      type="button"
      data-mol-id={`chat-mic-engine-${def.id}`}
      onClick={() => {
        if (!disabled()) ctx.voice.chooseVoiceEngine(def, props.autoStart)
      }}
      onMouseEnter={(event) => {
        if (!disabled()) event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
      class={cm.w('full')}
      style={styleOf({
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'flex-start',
        gap: '2px',
        padding: '8px 12px',
        border: 'none',
        'border-top': '1px solid rgba(128,128,128,0.12)',
        cursor: disabled() ? 'default' : 'pointer',
        color: 'inherit',
        'text-align': 'left',
        'font-size': '13px',
        opacity: disabled() ? 0.45 : 1,
        background: 'transparent',
      })}
    >
      <div style={styleOf({ display: 'flex', 'align-items': 'center', gap: '6px', width: '100%' })}>
        <span
          class={cm.fontWeight('medium')}
          style={styleOf({
            'min-width': '0px',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
          })}
        >
          {def.label}
        </span>
        <span
          style={styleOf(
            badgeStyle(
              ctx,
              { background: 'rgba(22,163,74,0.12)', color: 'rgb(22,163,74)' },
              { background: 'rgba(34,197,94,0.18)', color: 'rgb(74,222,128)' },
            ),
          )}
        >
          {kindLabel()}
        </span>
        <span style={styleOf({ flex: '1' })} />
        <Show when={isCurrent()}>
          <span
            style={styleOf(
              badgeStyle(
                ctx,
                { background: 'rgba(59,130,246,0.12)', color: 'rgb(37,99,235)' },
                { background: 'rgba(59,130,246,0.18)', color: 'rgb(96,165,250)' },
              ),
            )}
          >
            {t('ide.chat.voiceEngineCurrent', undefined, { defaultValue: 'current' })}
          </span>
        </Show>
        <Show when={reasonLabel()}>
          {(label) => (
            <span
              style={styleOf(
                badgeStyle(
                  ctx,
                  { background: 'rgba(220,38,38,0.10)', color: 'rgb(220,38,38)' },
                  { background: 'rgba(248,113,113,0.15)', color: 'rgb(248,113,113)' },
                ),
              )}
            >
              {label()}
            </span>
          )}
        </Show>
      </div>
      <span class={cm.textMuted} style={styleOf({ 'font-size': '11px' })} title={languagesTitle()}>
        {sizeLabel()} · {accuracyLabel()} · {languagesLabel()}
      </span>
    </button>
  )
}

/**
 * Renders the dictation engine picker.
 * @param props - The inner ctx (the open picker, the engine catalog and the
 *   chosen engine's id).
 * @returns The picker, or nothing while it is closed or no catalog is registered.
 */
export function ChatMicPicker(props: ChatMicPickerProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env

  /**
   * The open picker, or null when it is closed or no engine catalog is
   * registered (React's `micPicker && voiceEngines.length > 0`).
   * @returns The picker state, or null.
   */
  const openPicker = (): { autoStart: boolean } | null =>
    ctx.voice.voiceEngines().length > 0 ? ctx.voice.micPicker() : null

  return (
    <Show when={openPicker()}>
      {(picker) => (
        <div
          class={cm.cn(cm.surface, cm.borderAll)}
          style={styleOf({
            position: 'absolute',
            bottom: '100%',
            left: '0px',
            right: '0px',
            'margin-bottom': '0px',
            'border-radius': '6px 6px 0 0',
            'z-index': 100,
            'box-shadow': '0 -4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            'flex-direction': 'column',
            'max-height': ctx.env.popupMaxHeight(),
            'overflow-y': 'auto',
          })}
        >
          <div
            style={styleOf({
              padding: '8px 12px',
              'border-bottom': '1px solid rgba(128,128,128,0.12)',
              display: 'flex',
              'flex-direction': 'column',
              gap: '2px',
            })}
          >
            <span class={cm.fontWeight('medium')} style={styleOf({ 'font-size': '13px' })}>
              {t('ide.chat.voiceEngineTitle', undefined, { defaultValue: 'Dictation engine' })}
            </span>
            <span class={cm.textMuted} style={styleOf({ 'font-size': '11px' })}>
              {t('ide.chat.voiceEnginePrivacy', undefined, {
                defaultValue: 'Every option runs on your device — audio never leaves your browser.',
              })}
            </span>
          </div>
          <For each={ctx.voice.voiceEngines()}>
            {(def) => <EngineRow ctx={ctx} def={def} autoStart={picker().autoStart} />}
          </For>
        </div>
      )}
    </Show>
  )
}
