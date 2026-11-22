<!--
  React's section “Dictation engine picker (/mic)” (ChatPanel.tsx lines
  6059–6269): the popup that lets the user choose which dictation engine to use
  (and download), mirroring locked models in the `/model` picker. A row per
  registered engine, showing its kind, download size, accuracy and language
  coverage; engines this browser or the UI language cannot run are disabled with
  the reason shown.

  View only: the open picker, the catalog, the chosen engine and the
  disabled-reason check come from the slices through `ctx`.
-->
<script lang="ts">
  import type { VoiceEngineDef } from '@molecule/app-ai-voice'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

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
   * A row's size label: no download, one figure, or a range.
   *
   * @param definition - The engine.
   * @returns The localized label.
   */
  function sizeLabelFor(definition: VoiceEngineDef): string {
    const download = definition.downloadMB
    return download === undefined
      ? ctx.env.t('ide.chat.voiceEngineNoDownload', undefined, { defaultValue: 'no download' })
      : typeof download === 'number'
        ? ctx.env.t(
            'ide.chat.voiceEngineDownload',
            { mb: download },
            { defaultValue: '~{{mb}} MB download, then cached' },
          )
        : ctx.env.t(
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
  function accuracyLabelFor(definition: VoiceEngineDef): string {
    return definition.accuracy === 3
      ? ctx.env.t('ide.chat.voiceAccuracyBest', undefined, { defaultValue: 'best accuracy' })
      : definition.accuracy === 2
        ? ctx.env.t('ide.chat.voiceAccuracyGood', undefined, { defaultValue: 'good accuracy' })
        : ctx.env.t('ide.chat.voiceAccuracyBasic', undefined, { defaultValue: 'basic accuracy' })
  }

  /**
   * A row's language label: all languages, one language, or a count.
   *
   * @param definition - The engine.
   * @returns The localized label.
   */
  function languagesLabelFor(definition: VoiceEngineDef): string {
    if (definition.languages === 'all')
      return ctx.env.t('ide.chat.voiceLangsAll', undefined, { defaultValue: 'all languages' })
    const names = localizeLanguageNames(definition.languages)
    return names.length === 1
      ? ctx.env.t(
          'ide.chat.voiceLangOnly',
          { language: names[0] },
          { defaultValue: '{{language}} only' },
        )
      : ctx.env.t(
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
  function languagesTitleFor(definition: VoiceEngineDef): string | undefined {
    if (definition.languages === 'all') return undefined
    const names = localizeLanguageNames(definition.languages)
    return names.length > 1 ? names.join(', ') : undefined
  }
</script>

{#if ctx.voice.micPicker && ctx.voice.voiceEngines.length > 0}
  {@const autoStart = ctx.voice.micPicker.autoStart}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}; overflow-y: auto"
  >
    <div
      style="padding: 8px 12px; border-bottom: 1px solid rgba(128,128,128,0.12); display: flex; flex-direction: column; gap: 2px"
    >
      <span class={ctx.env.cm.fontWeight('medium')} style="font-size: 13px">
        {ctx.env.t('ide.chat.voiceEngineTitle', undefined, { defaultValue: 'Dictation engine' })}
      </span>
      <span class={ctx.env.cm.textMuted} style="font-size: 11px">
        {ctx.env.t('ide.chat.voiceEnginePrivacy', undefined, {
          defaultValue: 'Every option runs on your device — audio never leaves your browser.',
        })}
      </span>
    </div>
    {#each ctx.voice.voiceEngines as def (def.id)}
      {@const reason = ctx.voice.voiceEngineDisabledReason(def)}
      {@const disabled = reason !== null}
      {@const isCurrent = ctx.voice.currentVoiceEngineId === def.id}
      {@const sizeLabel = sizeLabelFor(def)}
      {@const accuracyLabel = accuracyLabelFor(def)}
      {@const languagesLabel = languagesLabelFor(def)}
      {@const languagesTitle = languagesTitleFor(def)}
      {@const kindLabel =
        def.kind === 'native'
          ? ctx.env.t('ide.chat.voiceEngineNative', undefined, { defaultValue: 'browser native' })
          : ctx.env.t('ide.chat.voiceEngineOnDevice', undefined, { defaultValue: 'on-device' })}
      {@const reasonLabel =
        reason === 'browser'
          ? ctx.env.t('ide.chat.voiceEngineNoBrowserSupport', undefined, {
              defaultValue: 'not available in this browser',
            })
          : reason === 'language'
            ? ctx.env.t('ide.chat.voiceEngineNoLanguageSupport', undefined, {
                defaultValue: 'not available for your language',
              })
            : null}
      <button
        type="button"
        data-mol-id={`chat-mic-engine-${def.id}`}
        onclick={() => {
          if (!disabled) ctx.voice.chooseVoiceEngine(def, autoStart)
        }}
        onmouseenter={(event) => {
          if (!disabled) event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
        }}
        onmouseleave={(event) => {
          event.currentTarget.style.background = 'transparent'
        }}
        class={ctx.env.cm.w('full')}
        style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px; border: none; border-top: 1px solid rgba(128,128,128,0.12); cursor: {disabled
          ? 'default'
          : 'pointer'}; color: inherit; text-align: left; font-size: 13px; opacity: {disabled
          ? 0.45
          : 1}"
        style:background="transparent"
      >
        <div style="display: flex; align-items: center; gap: 6px; width: 100%">
          <span
            class={ctx.env.cm.fontWeight('medium')}
            style="min-width: 0px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >
            {def.label}
          </span>
          <span
            style="font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; background: {ctx
              .env.isLight
              ? 'rgba(22,163,74,0.12)'
              : 'rgba(34,197,94,0.18)'}; color: {ctx.env.isLight
              ? 'rgb(22,163,74)'
              : 'rgb(74,222,128)'}"
          >
            {kindLabel}
          </span>
          <span style="flex: 1"></span>
          {#if isCurrent}
            <span
              style="font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; background: {ctx
                .env.isLight
                ? 'rgba(59,130,246,0.12)'
                : 'rgba(59,130,246,0.18)'}; color: {ctx.env.isLight
                ? 'rgb(37,99,235)'
                : 'rgb(96,165,250)'}"
            >
              {ctx.env.t('ide.chat.voiceEngineCurrent', undefined, { defaultValue: 'current' })}
            </span>
          {/if}
          {#if reasonLabel}
            <span
              style="font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; background: {ctx
                .env.isLight
                ? 'rgba(220,38,38,0.10)'
                : 'rgba(248,113,113,0.15)'}; color: {ctx.env.isLight
                ? 'rgb(220,38,38)'
                : 'rgb(248,113,113)'}"
            >
              {reasonLabel}
            </span>
          {/if}
        </div>
        <span class={ctx.env.cm.textMuted} style="font-size: 11px" title={languagesTitle}>
          {sizeLabel} · {accuracyLabel} · {languagesLabel}
        </span>
      </button>
    {/each}
  </div>
{/if}
