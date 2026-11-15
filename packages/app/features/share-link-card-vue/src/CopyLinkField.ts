/**
 * Vue internal copy-link field — the trimmed, diverged copy of
 * `@molecule/app-copy-link-field-vue` that `<ShareLinkCard>` renders. It is
 * NOT exported from the package barrel; use `@molecule/app-copy-link-field-vue`
 * for a standalone copy field.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Read-only input paired with a copy button that writes the given URL to the
 * clipboard, showing "Copied!" for 1500ms afterwards.
 *
 * @param props - Component props (see `CopyLinkFieldProps`).
 * @returns The copy-link field component.
 */
export const CopyLinkField = defineComponent({
  name: 'CopyLinkField',
  props: {
    value: {
      type: String,
      required: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the value, then shows the "Copied!" feedback for 1500ms. */
    const copy = (): void => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(props.value).then(() => {
          copied.value = true
          timer = setTimeout(() => {
            copied.value = false
          }, 1500)
        })
      }
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNodeChild =>
      h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className),
        },
        [
          h('input', {
            type: 'text',
            readonly: true,
            value: props.value,
            onFocus: (event: FocusEvent) => (event.target as HTMLInputElement).select(),
            class: cm.cn(cm.input(), cm.flex1),
          }),
          h(Button, { variant: 'solid', size: 'sm', onClick: copy }, () => [
            copied.value
              ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
              : t('copyLink.copy', {}, { defaultValue: 'Copy' }),
          ]),
        ],
      )
  },
})
