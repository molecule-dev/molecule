/**
 * Vue read-only input + copy-to-clipboard button.
 *
 * Vue counterpart of `@molecule/app-copy-link-field-react`'s
 * `CopyLinkField` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Read-only input + copy-to-clipboard button. Common in share-link
 * panels, API-key cards, webhook URLs.
 *
 * Copying uses `navigator.clipboard`, which exists only in secure contexts —
 * elsewhere the button silently does nothing and `onCopy` never fires. The
 * input is read-only and selects its content on focus, so manual Ctrl/Cmd+C
 * still works as the fallback. Labels use `copyLink.*` i18n keys.
 *
 * @param props - Component props (see {@link CopyLinkFieldProps}).
 * @returns The copy-link field component.
 */
export const CopyLinkField = defineComponent({
  name: 'CopyLinkField',
  props: {
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: undefined,
    },
    onCopy: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    feedbackMs: {
      type: Number,
      default: 1500,
    },
    size: {
      type: String as PropType<'sm' | 'md'>,
      default: 'sm',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the value, then shows the "Copied!" feedback for `feedbackMs`. */
    const copy = (): void => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(props.value).then(() => {
          copied.value = true
          props.onCopy?.()
          timer = setTimeout(() => {
            copied.value = false
          }, props.feedbackMs)
        })
      }
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNodeChild => [
      h(
        'div',
        {
          class: cm.cn(cm.stack(1), props.className),
        },
        [
          ...(props.label
            ? [
                h(
                  'span',
                  { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                  props.label,
                ),
              ]
            : []),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            h('input', {
              type: 'text',
              readonly: true,
              value: props.value,
              onFocus: (event: FocusEvent) => (event.target as HTMLInputElement).select(),
              class: cm.cn(cm.input(), cm.flex1),
              'aria-label': props.label ?? t('copyLink.field', {}, { defaultValue: 'Link' }),
            }),
            h(Button, { variant: 'solid', size: props.size, onClick: copy }, () => [
              copied.value
                ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
                : t('copyLink.copy', {}, { defaultValue: 'Copy' }),
            ]),
          ]),
        ],
      ),
    ]
  },
})
