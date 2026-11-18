/**
 * Vue embed-snippet panel: a substituted snippet inside `<pre>`, a
 * copy-to-clipboard button with "Copied!" feedback, and optional inline
 * width / height / theme controls bound to caller-provided state.
 *
 * Vue counterpart of `@molecule/app-embed-snippet-react`'s `EmbedSnippet` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  onUpdated,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
} from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { substituteTemplate } from './substitute.js'
import type {
  EmbedSnippetControls,
  EmbedSnippetLanguage,
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
 * Applies a controlled `<select>` value the way react-dom does
 * (`updateOptions`): select the option whose value matches, else the first
 * non-disabled option, else nothing.
 *
 * @param el - The select element.
 * @param desired - The value the `values` prop currently holds.
 */
const applySelectValue = (el: HTMLSelectElement, desired: string): void => {
  const options = Array.from(el.options)
  const match = options.find((option) => option.value === desired)
  if (match) {
    match.selected = true
    return
  }
  const fallback = options.find((option) => !option.disabled)
  if (fallback) fallback.selected = true
  else el.selectedIndex = -1
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
 * @param props - Component props (see {@link EmbedSnippetProps}).
 * @returns The embed-snippet panel.
 */
export const EmbedSnippet = defineComponent({
  name: 'EmbedSnippet',
  props: {
    template: {
      type: String,
      required: true,
    },
    controls: Object as PropType<EmbedSnippetControls>,
    values: Object as PropType<EmbedSnippetValues>,
    onChange: {
      type: Function as PropType<(next: EmbedSnippetValues) => void>,
      default: undefined,
    },
    language: {
      type: String as PropType<EmbedSnippetLanguage>,
      default: 'html',
    },
    heading: String,
    eyebrow: String,
    onCopy: {
      type: Function as PropType<(rendered: string) => void>,
      default: undefined,
    },
    feedbackMs: {
      type: Number,
      default: 1500,
    },
    molId: {
      type: String,
      default: 'embed-snippet',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    /** The theme `<select>`, whose selection follows `values.theme` after every render. */
    let themeSelect: HTMLSelectElement | null = null

    /**
     * Applies the current `values.theme` to the theme select, the way
     * react-dom's controlled `<select value>` does.
     */
    const syncThemeSelect = (): void => {
      if (themeSelect) applySelectValue(themeSelect, String((props.values ?? {}).theme ?? ''))
    }

    onMounted(syncThemeSelect)
    onUpdated(syncThemeSelect)
    onUnmounted(() => clearTimeout(timer))

    /**
     * Copies the rendered snippet, then shows the "Copied!" feedback for
     * `feedbackMs` — React's `handleCopy`.
     */
    const handleCopy = (): void => {
      const rendered = substituteTemplate(props.template, props.values)
      void copyTextWithFallback(rendered).then((didCopy) => {
        if (!didCopy) return
        copied.value = true
        props.onCopy?.(rendered)
        timer = setTimeout(() => {
          copied.value = false
        }, props.feedbackMs)
      })
    }

    /**
     * Merges one control's value into the caller's values — React's
     * `updateValue`.
     *
     * @param patch - The changed value.
     */
    const updateValue = (patch: Partial<EmbedSnippetValues>): void => {
      props.onChange?.({ ...(props.values ?? {}), ...patch })
    }

    return (): VNode => {
      const values = props.values ?? {}
      const molId = props.molId
      const rendered = substituteTemplate(props.template, props.values)
      const headingText =
        props.heading ?? t('embedSnippet.heading', {}, { defaultValue: 'Embed code' })
      const eyebrowText =
        props.eyebrow ?? t('embedSnippet.eyebrow', {}, { defaultValue: 'Copy embed code' })
      const copyLabel = copied.value
        ? t('embedSnippet.copied', {}, { defaultValue: 'Copied!' })
        : t('embedSnippet.copy', {}, { defaultValue: 'Copy' })
      const ariaLabel = t(
        'embedSnippet.aria.region',
        { language: props.language },
        { defaultValue: 'Embed code ({{language}})' },
      )

      const themeOptions: EmbedSnippetThemeOption[] = (() => {
        const theme = props.controls?.theme
        if (Array.isArray(theme)) return theme
        if (theme) {
          return DEFAULT_THEME_OPTIONS.map((opt) => ({
            value: opt.value,
            label: t(opt.labelKey, {}, { defaultValue: opt.defaultLabel }),
          }))
        }
        return []
      })()

      const controlsRow = (): VNode => {
        const controls = props.controls ?? {}
        const widthLabel = t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })
        const heightLabel = t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })
        const themeLabel = t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })
        const children: VNodeChild[] = []

        if (controls.width) {
          children.push(
            h(
              'label',
              {
                'data-mol-id': `${molId}-control-width`,
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })),
              },
              [
                h('span', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, widthLabel),
                h('input', {
                  type: 'text',
                  inputmode: 'numeric',
                  value: String(values.width ?? ''),
                  onInput: (event: Event) => {
                    const input = event.target as HTMLInputElement
                    updateValue({ width: input.value })
                    restoreInputValue(input, String((props.values ?? {}).width ?? ''))
                  },
                  class: cm.input(),
                  'aria-label': widthLabel,
                  'data-mol-id': `${molId}-input-width`,
                }),
              ],
            ),
          )
        }

        if (controls.height) {
          children.push(
            h(
              'label',
              {
                'data-mol-id': `${molId}-control-height`,
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })),
              },
              [
                h('span', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, heightLabel),
                h('input', {
                  type: 'text',
                  inputmode: 'numeric',
                  value: String(values.height ?? ''),
                  onInput: (event: Event) => {
                    const input = event.target as HTMLInputElement
                    updateValue({ height: input.value })
                    restoreInputValue(input, String((props.values ?? {}).height ?? ''))
                  },
                  class: cm.input(),
                  'aria-label': heightLabel,
                  'data-mol-id': `${molId}-input-height`,
                }),
              ],
            ),
          )
        }

        if (themeOptions.length > 0) {
          children.push(
            h(
              'label',
              {
                'data-mol-id': `${molId}-control-theme`,
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })),
              },
              [
                h('span', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, themeLabel),
                h(
                  'select',
                  {
                    ref: (el: unknown) => {
                      themeSelect = (el as HTMLSelectElement | null) ?? null
                    },
                    onChange: (event: Event) => {
                      const select = event.target as HTMLSelectElement
                      updateValue({ theme: select.value })
                      applySelectValue(select, String((props.values ?? {}).theme ?? ''))
                    },
                    class: cm.select(),
                    'aria-label': themeLabel,
                    'data-mol-id': `${molId}-input-theme`,
                  },
                  themeOptions.map((opt) =>
                    h('option', { key: opt.value, value: opt.value }, opt.label),
                  ),
                ),
              ],
            ),
          )
        }

        return h(
          'div',
          {
            'data-mol-id': `${molId}-controls`,
            class: cm.cn(
              cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.borderB,
            ),
          },
          children,
        )
      }

      return h(
        'section',
        {
          'data-mol-id': molId,
          'data-mol-language': props.language,
          'aria-label': ariaLabel,
          class: cm.cn(cm.surface, props.className),
        },
        [
          h(
            'header',
            {
              'data-mol-id': `${molId}-header`,
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.borderB,
              ),
            },
            [
              h('div', {}, [
                h(
                  'p',
                  {
                    'data-mol-id': `${molId}-eyebrow`,
                    class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted),
                  },
                  eyebrowText,
                ),
                h(
                  'h3',
                  {
                    'data-mol-id': `${molId}-heading`,
                    class: cm.cn(cm.textSize('base'), cm.fontWeight('bold')),
                  },
                  headingText,
                ),
              ]),
              h(
                Button,
                {
                  variant: 'solid',
                  size: 'sm',
                  onClick: handleCopy,
                  'data-mol-id': `${molId}-copy-button`,
                },
                () => [copyLabel],
              ),
            ],
          ),
          props.controls ? controlsRow() : null,
          // The generated embed code is code, not prose: never translated.
          h(
            'pre',
            {
              'data-mol-id': `${molId}-code`,
              translate: 'no',
              class: cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm')),
            },
            [h('code', {}, rendered)],
          ),
        ],
      )
    }
  },
})
