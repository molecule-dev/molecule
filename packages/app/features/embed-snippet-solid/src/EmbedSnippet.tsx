import { type Component, createSignal, type JSX, onCleanup } from 'solid-js'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import { substituteTemplate } from './substitute.js'
import type {
  EmbedSnippetControls,
  EmbedSnippetProps,
  EmbedSnippetThemeOption,
  EmbedSnippetValues,
} from './types.js'

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

/**
 * The option a controlled `<select>` selects for a value, the way react-dom's
 * `updateOptions` does: the matching option, else the first one.
 *
 * @param options - The rendered options.
 * @param desired - The value the `values` prop currently holds.
 * @returns The value the select's selection follows.
 */
const effectiveSelectValue = (
  options: readonly EmbedSnippetThemeOption[],
  desired: string,
): string => {
  if (options.some((option) => option.value === desired)) return desired
  const fallback = options[0]
  return fallback ? fallback.value : desired
}

/**
 * Restores a controlled text input to the prop's value after a native input
 * event, the way react-dom does: the property and the attribute both follow
 * the prop until a parent renders a new value.
 *
 * @param el - The input element.
 * @param text - The value the prop currently holds.
 */
const restoreInputValue = (el: HTMLInputElement, text: string): void => {
  if (el.value !== text) el.value = text
  if (el.getAttribute('value') !== text) el.setAttribute('value', text)
}

/**
 * `<EmbedSnippet>` — the "Copy embed code" panel.
 *
 * Renders a substituted snippet inside a `<pre>` element, a copy-to-clipboard
 * button with "Copied!" feedback, and (optionally) inline width / height /
 * theme controls bound to `values` + `onChange`.
 *
 * This is the Solid counterpart of `@molecule/app-embed-snippet-react`: the
 * same props (React names), the same ClassMap tokens, the same i18n keys and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link EmbedSnippetProps}).
 * @returns The rendered embed-snippet panel.
 */
export const EmbedSnippet: Component<EmbedSnippetProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const language = (): string => props.language ?? 'html'
  const molId = (): string => props.molId ?? 'embed-snippet'
  const values = (): EmbedSnippetValues => props.values ?? {}

  /**
   * The theme options: the caller's array, the translated defaults for
   * `controls.theme === true`, or none.
   *
   * @returns The options to render.
   */
  const themeOptions = (): EmbedSnippetThemeOption[] => {
    const theme = props.controls?.theme
    if (Array.isArray(theme)) return theme
    if (theme)
      return DEFAULT_THEME_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey, {}, { defaultValue: opt.defaultLabel }),
      }))
    return []
  }

  /**
   * Merges one control's value into the caller's values — React's
   * `updateValue`.
   *
   * @param patch - The changed value.
   */
  const updateValue = (patch: Partial<EmbedSnippetValues>): void => {
    props.onChange?.({ ...values(), ...patch })
  }

  /**
   * Copies the rendered snippet, then shows the "Copied!" feedback for
   * `feedbackMs` — React's `handleCopy`.
   */
  const handleCopy = (): void => {
    const rendered = substituteTemplate(props.template, props.values)
    void copyTextWithFallback(rendered).then((copied) => {
      if (!copied) return
      setCopied(true)
      props.onCopy?.(rendered)
      timer = setTimeout(() => setCopied(false), props.feedbackMs ?? 1500)
    })
  }

  onCleanup(() => clearTimeout(timer))

  /**
   * Renders one labelled control row (a `<label>` with a caption and its
   * input) exactly as React does.
   *
   * @param name - The control's `data-mol-id` suffix and translation key.
   * @param label - The already-translated caption.
   * @param control - The input element.
   * @returns The labelled row.
   */
  const control = (name: string, label: string, control: JSX.Element): JSX.Element => (
    <label
      data-mol-id={`${molId()}-control-${name}`}
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
    >
      <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{label}</span>
      {control}
    </label>
  )

  const controlsRow = (): JSX.Element => {
    const controls: EmbedSnippetControls = props.controls ?? {}
    const widthLabel = t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })
    const heightLabel = t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })
    const themeLabel = t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })
    const options = themeOptions()

    return (
      <div
        data-mol-id={`${molId()}-controls`}
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.borderB,
        )}
      >
        {controls.width
          ? control(
              'width',
              widthLabel,
              <input
                type="text"
                inputmode="numeric"
                value={String(values().width ?? '')}
                attr:value={String(values().width ?? '')}
                onInput={(event) => {
                  const input = event.currentTarget
                  updateValue({ width: input.value })
                  restoreInputValue(input, String(values().width ?? ''))
                }}
                class={cm.input()}
                aria-label={widthLabel}
                data-mol-id={`${molId()}-input-width`}
              />,
            )
          : null}
        {controls.height
          ? control(
              'height',
              heightLabel,
              <input
                type="text"
                inputmode="numeric"
                value={String(values().height ?? '')}
                attr:value={String(values().height ?? '')}
                onInput={(event) => {
                  const input = event.currentTarget
                  updateValue({ height: input.value })
                  restoreInputValue(input, String(values().height ?? ''))
                }}
                class={cm.input()}
                aria-label={heightLabel}
                data-mol-id={`${molId()}-input-height`}
              />,
            )
          : null}
        {options.length > 0
          ? control(
              'theme',
              themeLabel,
              <select
                value={effectiveSelectValue(options, String(values().theme ?? ''))}
                onChange={(event) => {
                  const select = event.currentTarget
                  updateValue({ theme: select.value })
                  select.value = effectiveSelectValue(themeOptions(), String(values().theme ?? ''))
                }}
                class={cm.select()}
                aria-label={themeLabel}
                data-mol-id={`${molId()}-input-theme`}
              >
                {options.map((option) => (
                  <option value={option.value}>{option.label}</option>
                ))}
              </select>,
            )
          : null}
      </div>
    )
  }

  return (
    <section
      data-mol-id={molId()}
      data-mol-language={language()}
      aria-label={t(
        'embedSnippet.aria.region',
        { language: language() },
        { defaultValue: 'Embed code ({{language}})' },
      )}
      class={cm.cn(cm.surface, props.className)}
    >
      <header
        data-mol-id={`${molId()}-header`}
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.borderB,
        )}
      >
        <div>
          <p
            data-mol-id={`${molId()}-eyebrow`}
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
          >
            {props.eyebrow ?? t('embedSnippet.eyebrow', {}, { defaultValue: 'Copy embed code' })}
          </p>
          <h3
            data-mol-id={`${molId()}-heading`}
            class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
          >
            {props.heading ?? t('embedSnippet.heading', {}, { defaultValue: 'Embed code' })}
          </h3>
        </div>
        <Button
          variant="solid"
          size="sm"
          onClick={handleCopy}
          data-mol-id={`${molId()}-copy-button`}
        >
          {copied()
            ? t('embedSnippet.copied', {}, { defaultValue: 'Copied!' })
            : t('embedSnippet.copy', {}, { defaultValue: 'Copy' })}
        </Button>
      </header>
      {props.controls ? controlsRow() : null}
      {/* The generated embed code is code, not prose: never translated. */}
      <pre
        data-mol-id={`${molId()}-code`}
        translate="no"
        class={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}
      >
        <code>{substituteTemplate(props.template, props.values)}</code>
      </pre>
    </section>
  )
}
