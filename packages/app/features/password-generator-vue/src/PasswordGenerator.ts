/**
 * Vue password generator — the Vue counterpart of
 * `@molecule/app-password-generator-react`'s `PasswordGenerator`: the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import {
  clampLength,
  DEFAULT_CHARSET,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
} from './generator.js'
import type { PasswordCharsetOptions, PasswordGeneratorProps } from './types.js'

/**
 * Cryptographically-secure password generator UI.
 *
 * Renders a length slider (`MIN_LENGTH`-`MAX_LENGTH`), six character-class
 * toggles (uppercase / lowercase / digits / symbols / no-similar /
 * no-ambiguous), a copyable read-only output, a regenerate button, and
 * a "Use this password" picker that fires `onPick(password)`.
 *
 * Randomness is sourced via `crypto.getRandomValues` (see `./generator.ts`).
 * All styling flows through `getClassMap()` and all user-visible strings
 * through `t()` — no Tailwind class strings, no hardcoded text.
 *
 * @param props - Component props (see {@link PasswordGeneratorProps}).
 * @returns The password generator component.
 */
export const PasswordGenerator = defineComponent({
  name: 'PasswordGenerator',
  props: {
    defaultLength: {
      type: Number,
      default: 20,
    },
    defaultCharset: {
      type: Object as PropType<PasswordGeneratorProps['defaultCharset']>,
      default: undefined,
    },
    onPick: {
      type: Function as PropType<PasswordGeneratorProps['onPick']>,
      default: undefined,
    },
    autoCopy: {
      type: Boolean,
      default: false,
    },
    ariaLabel: String,
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // React's `useState` initializers: read the props once, at mount. A later
    // `defaultLength` / `defaultCharset` prop change does not reset the state.
    const initialLength = clampLength(props.defaultLength)
    const initialCharset: PasswordCharsetOptions = { ...DEFAULT_CHARSET, ...props.defaultCharset }

    const length = ref(initialLength)
    const charset = ref<PasswordCharsetOptions>(initialCharset)
    const password = ref(generatePassword(initialLength, initialCharset))
    const copied = ref(false)
    let copiedTimer: ReturnType<typeof setTimeout> | undefined

    /**
     * Lazy clipboard write — never blocks the regenerate path on failure.
     *
     * @param value - The password text to copy.
     */
    const writeClipboard = (value: string): void => {
      void copyTextWithFallback(value).then((copiedOk) => {
        if (!copiedOk) return
        copied.value = true
        if (copiedTimer) clearTimeout(copiedTimer)
        copiedTimer = setTimeout(() => {
          copied.value = false
        }, 1500)
      })
    }

    /** Generates a fresh password for the current length and charset. */
    const regenerate = (): void => {
      const next = generatePassword(length.value, charset.value)
      password.value = next
      if (props.autoCopy) writeClipboard(next)
    }

    // React keeps the displayed password in sync through
    // `useEffect(regenerate, [regenerate])`, which runs on mount and whenever
    // `length`, `charset` or `autoCopy` changes.
    watch([length, charset, () => props.autoCopy], regenerate, { immediate: true })

    onUnmounted(() => {
      if (copiedTimer) clearTimeout(copiedTimer)
    })

    /**
     * Flips one charset toggle.
     *
     * @param key - The toggle's charset key.
     * @param value - The new state.
     */
    const updateCharset = (key: keyof PasswordCharsetOptions, value: boolean): void => {
      charset.value = { ...charset.value, [key]: value }
    }

    /** Copies the displayed password. */
    const copyNow = (): void => writeClipboard(password.value)

    /** Hands the displayed password to `onPick`. */
    const pickNow = (): void => {
      props.onPick?.(password.value)
    }

    // Inline styles only for things ClassMap can't express: the bare
    // monospace + word-break for the password readout, and the slider's
    // full-width track. Everything else uses cm.* classes.
    const passwordStyle = {
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      wordBreak: 'break-all',
      letterSpacing: '0.04em',
    }
    const sliderStyle = { width: '100%' }

    /**
     * One character-class toggle row: the checkbox plus its label.
     *
     * @param key - The toggle's charset key.
     * @param label - The already-translated label text.
     * @returns The rendered toggle row.
     */
    const toggleRow = (key: keyof PasswordCharsetOptions, label: string): VNode =>
      h(
        'label',
        {
          class: cm.flex({ align: 'center', gap: 'sm' }),
          'data-mol-id': `password-toggle-${key}`,
        },
        [
          h('input', {
            type: 'checkbox',
            // React's controlled checkbox carries the `checked` ATTRIBUTE from
            // mount (react-dom writes `defaultChecked`) and afterwards only the
            // live property. Vue's `checked` VNode prop re-writes the attribute
            // on every patch (patchProp → patchAttr), which would drop it after
            // the first toggle, so both states are applied directly: the mount
            // attribute from the initial charset, the property from the state.
            ref: (element: unknown) => {
              const input = element as HTMLInputElement | null
              if (!input) return
              if (input.defaultChecked !== initialCharset[key]) {
                input.defaultChecked = initialCharset[key]
              }
              if (input.checked !== charset.value[key]) input.checked = charset.value[key]
            },
            onChange: (event: Event) =>
              updateCharset(key, (event.target as HTMLInputElement).checked),
            'aria-label': label,
          }),
          h('span', { class: cm.textSize('sm') }, label),
        ],
      )

    return (): VNode => {
      const readoutLabel =
        props.ariaLabel ??
        t('password-generator.readoutLabel', {}, { defaultValue: 'Generated password' })

      return h(
        'div',
        {
          class: cm.cn(cm.stack(2 as const), props.className),
          'data-mol-id': props.dataMolId,
          'data-mol-component': 'password-generator',
        },
        [
          // Generated password readout + copy button
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            h('input', {
              type: 'text',
              readOnly: true,
              // Vue writes a `value` prop to the live property AND the `value`
              // attribute (runtime-dom's patchProp), which is exactly what
              // react-dom's controlled input does.
              value: password.value,
              onFocus: (event: FocusEvent) => (event.target as HTMLInputElement).select(),
              'aria-label': readoutLabel,
              'data-mol-id': 'password-readout',
              class: cm.cn(cm.input(), cm.flex1),
              style: passwordStyle,
            }),
            h(
              Button,
              {
                variant: 'solid',
                size: 'sm',
                onClick: copyNow,
                'data-mol-id': 'password-copy',
              },
              (): VNodeChild[] => [
                copied.value
                  ? t('password-generator.copied', {}, { defaultValue: 'Copied!' })
                  : t('password-generator.copy', {}, { defaultValue: 'Copy' }),
              ],
            ),
            h(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                onClick: regenerate,
                'data-mol-id': 'password-regenerate',
              },
              (): VNodeChild[] => [
                t('password-generator.regenerate', {}, { defaultValue: 'Regenerate' }),
              ],
            ),
          ]),
          // Length slider
          h('div', { class: cm.stack(1 as const) }, [
            h(
              'label',
              {
                for: 'password-generator-length',
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
              },
              [
                t(
                  'password-generator.length',
                  { length: length.value },
                  { defaultValue: 'Length: {{length}}' },
                ),
              ],
            ),
            h('input', {
              id: 'password-generator-length',
              type: 'range',
              min: MIN_LENGTH,
              max: MAX_LENGTH,
              step: 1,
              value: String(length.value),
              onInput: (event: Event) =>
                (length.value = clampLength(Number((event.target as HTMLInputElement).value))),
              'aria-label': t(
                'password-generator.lengthLabel',
                {},
                { defaultValue: 'Password length' },
              ),
              'data-mol-id': 'password-length',
              style: sliderStyle,
            }),
          ]),
          // Charset toggles
          h('div', { class: cm.flex({ direction: 'col', gap: 'xs' }) }, [
            toggleRow(
              'uppercase',
              t('password-generator.toggle.uppercase', {}, { defaultValue: 'Uppercase (A-Z)' }),
            ),
            toggleRow(
              'lowercase',
              t('password-generator.toggle.lowercase', {}, { defaultValue: 'Lowercase (a-z)' }),
            ),
            toggleRow(
              'digits',
              t('password-generator.toggle.digits', {}, { defaultValue: 'Digits (0-9)' }),
            ),
            toggleRow(
              'symbols',
              t('password-generator.toggle.symbols', {}, { defaultValue: 'Symbols (!@#…)' }),
            ),
            toggleRow(
              'noSimilar',
              t(
                'password-generator.toggle.noSimilar',
                {},
                {
                  defaultValue: 'Skip similar (0/O/1/l/I)',
                },
              ),
            ),
            toggleRow(
              'noAmbiguous',
              t(
                'password-generator.toggle.noAmbiguous',
                {},
                {
                  defaultValue: 'Skip ambiguous (space, quotes)',
                },
              ),
            ),
          ]),
          // Pick button — only renders if onPick was supplied
          ...(props.onPick
            ? [
                h(
                  Button,
                  {
                    variant: 'solid',
                    size: 'md',
                    onClick: pickNow,
                    'data-mol-id': 'password-pick',
                  },
                  (): VNodeChild[] => [
                    t('password-generator.pick', {}, { defaultValue: 'Use this password' }),
                  ],
                ),
              ]
            : []),
        ],
      )
    }
  },
})
