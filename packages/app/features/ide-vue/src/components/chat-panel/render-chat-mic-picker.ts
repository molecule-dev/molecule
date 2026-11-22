/**
 * The dictation engine picker (`/mic`) — React's render section "Dictation
 * engine picker (/mic)": the popup that lets the user choose which dictation
 * engine to use (and download), with the engines this browser or the UI
 * language cannot run disabled and their reason shown.
 *
 * Owned by U12, nested inside the input area, rendered right above the model
 * picker in React's order.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { VoiceEngineDef } from '@molecule/app-ai-voice'

import type { ChatCtx } from './context.js'

/**
 * Localizes an engine's language coverage names.
 *
 * The names come from the browser's `Intl.DisplayNames`, so only the surrounding
 * templates need bond translations. An unavailable (or odd-locale)
 * `Intl.DisplayNames` falls back to the bare language codes.
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
 * Renders the dictation engine picker.
 *
 * @param ctx - The panel context (the open picker, the engine catalog, the
 *   chosen engine, the theme and the disabled-reason check).
 * @returns The picker, or `null` while it is closed or no catalog is registered.
 */
export function renderChatMicPicker(ctx: ChatCtx): VNodeChild {
  const micPicker = ctx.voice.micPicker.value
  const voiceEngines = ctx.voice.voiceEngines.value
  if (!micPicker || voiceEngines.length === 0) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isLight = ctx.env.isLight.value
  const currentVoiceEngineId = ctx.voice.currentVoiceEngineId.value

  const renderRow = (definition: VoiceEngineDef): VNodeChild => {
    const reason = ctx.voice.voiceEngineDisabledReason(definition)
    const disabled = reason !== null
    const isCurrent = currentVoiceEngineId === definition.id
    const download = definition.downloadMB
    const sizeLabel =
      download === undefined
        ? t('ide.chat.voiceEngineNoDownload', undefined, { defaultValue: 'no download' })
        : typeof download === 'number'
          ? t(
              'ide.chat.voiceEngineDownload',
              { mb: download },
              {
                defaultValue: '~{{mb}} MB download, then cached',
              },
            )
          : t(
              'ide.chat.voiceEngineDownloadRange',
              { min: download[0], max: download[1] },
              {
                defaultValue: '~{{min}}–{{max}} MB download, then cached',
              },
            )
    const accuracyLabel =
      definition.accuracy === 3
        ? t('ide.chat.voiceAccuracyBest', undefined, { defaultValue: 'best accuracy' })
        : definition.accuracy === 2
          ? t('ide.chat.voiceAccuracyGood', undefined, { defaultValue: 'good accuracy' })
          : t('ide.chat.voiceAccuracyBasic', undefined, {
              defaultValue: 'basic accuracy',
            })
    const languageNames =
      definition.languages === 'all' ? [] : localizeLanguageNames(definition.languages)
    const languagesLabel =
      definition.languages === 'all'
        ? t('ide.chat.voiceLangsAll', undefined, { defaultValue: 'all languages' })
        : languageNames.length === 1
          ? t(
              'ide.chat.voiceLangOnly',
              { language: languageNames[0] },
              {
                defaultValue: '{{language}} only',
              },
            )
          : t(
              'ide.chat.voiceLangsCount',
              { count: languageNames.length },
              {
                defaultValue: '{{count}} languages',
              },
            )
    // Full list on hover for the multi-language engines
    const languagesTitle = languageNames.length > 1 ? languageNames.join(', ') : undefined
    const kindLabel =
      definition.kind === 'native'
        ? t('ide.chat.voiceEngineNative', undefined, { defaultValue: 'browser native' })
        : t('ide.chat.voiceEngineOnDevice', undefined, { defaultValue: 'on-device' })
    const reasonLabel =
      reason === 'browser'
        ? t('ide.chat.voiceEngineNoBrowserSupport', undefined, {
            defaultValue: 'not available in this browser',
          })
        : reason === 'language'
          ? t('ide.chat.voiceEngineNoLanguageSupport', undefined, {
              defaultValue: 'not available for your language',
            })
          : null

    return h(
      'button',
      {
        /* mol-bespoke-button: dictation engine row — full-width list item in the /mic popup */
        key: definition.id,
        type: 'button',
        'data-mol-id': `chat-mic-engine-${definition.id}`,
        onClick: () => {
          if (!disabled) ctx.voice.chooseVoiceEngine(definition, micPicker.autoStart)
        },
        onMouseenter: (event: Event) => {
          if (disabled) return
          const target = event.currentTarget as HTMLElement | null
          if (target) target.style.background = 'rgba(128,128,128,0.15)'
        },
        onMouseleave: (event: Event) => {
          const target = event.currentTarget as HTMLElement | null
          if (target) target.style.background = 'transparent'
        },
        class: cm.w('full'),
        style: {
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
          opacity: disabled ? '0.45' : '1',
          background: 'transparent',
        },
      },
      [
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%' } }, [
          h(
            'span',
            {
              class: cm.fontWeight('medium'),
              style: {
                minWidth: '0px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            [definition.label],
          ),
          h(
            'span',
            {
              style: {
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                flexShrink: '0',
                background: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
                color: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)',
              },
            },
            [kindLabel],
          ),
          h('span', { style: { flex: '1' } }),
          isCurrent
            ? h(
                'span',
                {
                  style: {
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    flexShrink: '0',
                    background: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
                    color: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)',
                  },
                },
                [t('ide.chat.voiceEngineCurrent', undefined, { defaultValue: 'current' })],
              )
            : null,
          reasonLabel
            ? h(
                'span',
                {
                  style: {
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    flexShrink: '0',
                    background: isLight ? 'rgba(220,38,38,0.10)' : 'rgba(248,113,113,0.15)',
                    color: isLight ? 'rgb(220,38,38)' : 'rgb(248,113,113)',
                  },
                },
                [reasonLabel],
              )
            : null,
        ]),
        h(
          'span',
          {
            class: cm.textMuted,
            style: { fontSize: '11px' },
            title: languagesTitle,
          },
          [`${sizeLabel} · ${accuracyLabel} · ${languagesLabel}`],
        ),
      ],
    )
  }

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0',
        right: '0',
        marginBottom: '0',
        borderRadius: '6px 6px 0 0',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: ctx.env.popupMaxHeight.value,
        overflowY: 'auto',
      },
    },
    [
      h(
        'div',
        {
          style: {
            padding: '8px 12px',
            borderBottom: '1px solid rgba(128,128,128,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          },
        },
        [
          h('span', { class: cm.fontWeight('medium'), style: { fontSize: '13px' } }, [
            t('ide.chat.voiceEngineTitle', undefined, { defaultValue: 'Dictation engine' }),
          ]),
          h('span', { class: cm.textMuted, style: { fontSize: '11px' } }, [
            t('ide.chat.voiceEnginePrivacy', undefined, {
              defaultValue: 'Every option runs on your device — audio never leaves your browser.',
            }),
          ]),
        ],
      ),
      voiceEngines.map((definition) => renderRow(definition)),
    ],
  )
}
