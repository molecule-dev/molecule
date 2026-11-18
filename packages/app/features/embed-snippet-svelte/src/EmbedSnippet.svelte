<!--
  EmbedSnippet: the Svelte counterpart of `@molecule/app-embed-snippet-react`'s
  `EmbedSnippet` — a substituted snippet inside a `<pre>`, a copy-to-clipboard
  button with "Copied!" feedback, and optional inline width / height / theme
  controls bound to caller-provided state. Same props, same DOM for the same
  input: every visible string goes through `t()` so a locale switch re-renders
  it, and the controlled input/select carry React's value handling (see
  `value.ts`).
-->
<script lang="ts">
  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import { substituteTemplate } from './substitute.js'
  import type { EmbedSnippetProps, EmbedSnippetThemeOption, EmbedSnippetValues } from './types.js'
  import {
    applyInputValue,
    applySelectValue,
    effectiveSelectValue,
    reactInputValue,
    reactSelectValue,
  } from './value.js'

  /** Default theme options used when `controls.theme === true`. */
  const DEFAULT_THEME_OPTIONS: ReadonlyArray<{
    value: string
    labelKey: string
    defaultLabel: string
  }> = [
    { value: 'light', labelKey: 'embedSnippet.theme.light', defaultLabel: 'Light' },
    { value: 'dark', labelKey: 'embedSnippet.theme.dark', defaultLabel: 'Dark' },
    { value: 'auto', labelKey: 'embedSnippet.theme.auto', defaultLabel: 'Auto' },
  ]

  let {
    template,
    controls,
    values,
    onChange,
    language = 'html',
    heading,
    eyebrow,
    onCopy,
    feedbackMs = 1500,
    molId = 'embed-snippet',
    className,
  }: EmbedSnippetProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  // Detaches the feedback timer with the component (React leaves it running;
  // the write it would make on a dead component is observable nowhere).
  $effect(() => () => clearTimeout(timer))

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const headingText = $derived(
    heading ?? t('embedSnippet.heading', {}, { defaultValue: 'Embed code' }),
  )
  const eyebrowText = $derived(
    eyebrow ?? t('embedSnippet.eyebrow', {}, { defaultValue: 'Copy embed code' }),
  )
  const copyLabel = $derived(
    copied
      ? t('embedSnippet.copied', {}, { defaultValue: 'Copied!' })
      : t('embedSnippet.copy', {}, { defaultValue: 'Copy' }),
  )
  const ariaLabel = $derived(
    t('embedSnippet.aria.region', { language }, { defaultValue: 'Embed code ({{language}})' }),
  )
  const rendered = $derived(substituteTemplate(template, values))
  const themeOptions = $derived<EmbedSnippetThemeOption[]>(
    Array.isArray(controls?.theme)
      ? controls.theme
      : controls?.theme
        ? DEFAULT_THEME_OPTIONS.map((opt) => ({
            value: opt.value,
            label: t(opt.labelKey, {}, { defaultValue: opt.defaultLabel }),
          }))
        : [],
  )
  const widthLabel = $derived(t('embedSnippet.controls.width', {}, { defaultValue: 'Width' }))
  const heightLabel = $derived(t('embedSnippet.controls.height', {}, { defaultValue: 'Height' }))
  const themeLabel = $derived(t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' }))

  /**
   * Merges one control's value into the caller's values — React's
   * `updateValue`.
   *
   * @param patch - The changed value.
   */
  function updateValue(patch: Partial<EmbedSnippetValues>): void {
    onChange?.({ ...(values ?? {}), ...patch })
  }

  /**
   * Copies the rendered snippet, then shows the "Copied!" feedback for
   * `feedbackMs` — React's `handleCopy`.
   */
  function handleCopy(): void {
    void copyTextWithFallback(rendered).then((didCopy) => {
      if (!didCopy) return
      copied = true
      onCopy?.(rendered)
      timer = setTimeout(() => {
        copied = false
      }, feedbackMs)
    })
  }
</script>

<section
  data-mol-id={molId}
  data-mol-language={language}
  aria-label={ariaLabel}
  class={cm.cn(cm.surface, className)}
>
  <header
    data-mol-id={`${molId}-header`}
    class={cm.cn(
      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.borderB,
    )}
  >
    <div>
      <p
        data-mol-id={`${molId}-eyebrow`}
        class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
      >
        {eyebrowText}
      </p>
      <h3
        data-mol-id={`${molId}-heading`}
        class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
      >
        {headingText}
      </h3>
    </div>
    <Button variant="solid" size="sm" onClick={handleCopy} data-mol-id={`${molId}-copy-button`}>
      {copyLabel}
    </Button>
  </header>
  {#if controls}
    <div
      data-mol-id={`${molId}-controls`}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.borderB,
      )}
    >
      {#if controls.width}
        <label
          data-mol-id={`${molId}-control-width`}
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{widthLabel}</span>
          <input
            type="text"
            inputmode="numeric"
            use:reactInputValue={{ value: String(values?.width ?? '') }}
            oninput={(event) => {
              const input = event.currentTarget as HTMLInputElement
              updateValue({ width: input.value })
              applyInputValue(input, String(values?.width ?? ''))
            }}
            class={cm.input()}
            aria-label={widthLabel}
            data-mol-id={`${molId}-input-width`}
          />
        </label>
      {/if}
      {#if controls.height}
        <label
          data-mol-id={`${molId}-control-height`}
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{heightLabel}</span>
          <input
            type="text"
            inputmode="numeric"
            use:reactInputValue={{ value: String(values?.height ?? '') }}
            oninput={(event) => {
              const input = event.currentTarget as HTMLInputElement
              updateValue({ height: input.value })
              applyInputValue(input, String(values?.height ?? ''))
            }}
            class={cm.input()}
            aria-label={heightLabel}
            data-mol-id={`${molId}-input-height`}
          />
        </label>
      {/if}
      {#if themeOptions.length > 0}
        <label
          data-mol-id={`${molId}-control-theme`}
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{themeLabel}</span>
          <select
            use:reactSelectValue={{
              value: effectiveSelectValue(
                themeOptions.map((option) => option.value),
                String(values?.theme ?? ''),
              ),
            }}
            onchange={(event) => {
              const select = event.currentTarget as HTMLSelectElement
              updateValue({ theme: select.value })
              applySelectValue(
                select,
                effectiveSelectValue(
                  themeOptions.map((option) => option.value),
                  String(values?.theme ?? ''),
                ),
              )
            }}
            class={cm.select()}
            aria-label={themeLabel}
            data-mol-id={`${molId}-input-theme`}
          >
            {#each themeOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
  {/if}
  <!-- The generated embed code is code, not prose: never translated. -->
  <pre
    data-mol-id={`${molId}-code`}
    translate="no"
    class={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}><code>{rendered}</code></pre>
</section>
