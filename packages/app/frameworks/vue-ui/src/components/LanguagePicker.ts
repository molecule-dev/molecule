/**
 * Vue LanguagePicker UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'

import { useTranslation } from '../hooks/useTranslation.js'
import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'

/**
 * Vue LanguagePicker UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s LanguagePicker: a globe-icon
 * button that opens a modal grid of every locale registered with the bonded
 * i18n provider. Clicking a locale calls `setLocale` and closes the modal.
 * The list of choices stays in sync with the provider — no hardcoded language
 * list. Molecule-convention markers baked in:
 * `data-mol-id="language-picker-trigger"` on the trigger,
 * `data-mol-id="language-picker-modal"` on the modal dialog, and
 * `data-mol-id="language-picker-option-<code>"` plus `data-active` and
 * `aria-pressed` on each locale button.
 */
export const LanguagePicker = defineComponent({
  name: 'MLanguagePicker',
  inheritAttrs: false,
  props: {
    labelKey: {
      type: String,
      default: 'footer.language',
    },
    labelDefault: {
      type: String,
      default: 'Language',
    },
    modalTitleKey: {
      type: String,
      default: 'languagePicker.modalTitle',
    },
    modalTitleDefault: {
      type: String,
      default: 'Choose language',
    },
    icon: {
      type: String as PropType<IconName>,
      default: 'globe',
    },
    iconSize: {
      type: Number,
      default: 16,
    },
    display: {
      type: String as PropType<'name' | 'code' | 'icon'>,
      default: 'name',
    },
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
    renderTrigger: {
      type: Function as PropType<(open: () => void) => unknown>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t, locale, setLocale, locales } = useTranslation()
    const open = ref(false)

    return () => {
      const currentName = locales.value.find((l) => l.code === locale.value)?.name ?? locale.value
      const triggerLabel =
        props.display === 'icon' ? null : props.display === 'code' ? locale.value : currentName

      const trigger = props.renderTrigger
        ? props.renderTrigger(() => {
            open.value = true
          })
        : h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'language-picker-trigger',
              'aria-label': t(props.labelKey, {}, { defaultValue: props.labelDefault }),
              onClick: () => {
                open.value = true
              },
              class: cm.cn(cm.languagePickerTrigger, ...classOf(props.className, attrs)),
              style: styleOf(props.style, attrs),
              ...restAttrs(attrs),
            },
            [
              h(Icon, { name: props.icon, size: props.iconSize }),
              triggerLabel != null ? h('span', triggerLabel) : null,
            ],
          )

      return [
        trigger,
        h(
          Modal,
          {
            open: open.value,
            onClose: () => {
              open.value = false
            },
            title: t(props.modalTitleKey, {}, { defaultValue: props.modalTitleDefault }),
            size: 'lg',
            'data-mol-id': 'language-picker-modal',
          },
          {
            default: () =>
              h(
                'div',
                { class: cm.languageGrid },
                [...locales.value]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => {
                    const active = l.code === locale.value
                    return h(
                      'button',
                      {
                        key: l.code,
                        type: 'button',
                        'data-mol-id': `language-picker-option-${l.code}`,
                        'data-active': active || undefined,
                        'aria-pressed': active,
                        onClick: async () => {
                          await setLocale(l.code)
                          open.value = false
                        },
                        class: active ? cm.languageActive : cm.languageOption,
                      },
                      l.name,
                    )
                  }),
              ),
          },
        ),
      ]
    }
  },
})
