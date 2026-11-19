/**
 * Vue LanguagePicker UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap, type HTMLElementProps } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Icon } from './Icon.js'
import { Modal } from './Modal.js'

/**
 * Props for {@link LanguagePicker}.
 *
 * Vue port of `@molecule/app-ui-react`'s `LanguagePickerProps`: React extends
 * the `<button>` attributes here, so this extends the kit's element props and
 * any other button attribute (`data-*`, `aria-*`, listeners) falls through to
 * the trigger button, exactly as React's `...rest` spread does.
 */
export interface LanguagePickerProps extends Omit<HTMLElementProps, 'aria-label' | 'onClick'> {
  /** i18n key for the trigger button label / aria-label. Defaults to `'footer.language'`. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. Defaults to `'Language'`. */
  labelDefault?: string
  /** i18n key for the modal title. Defaults to `'languagePicker.modalTitle'`. */
  modalTitleKey?: string
  /** Fallback modal title if the i18n key is missing. Defaults to `'Choose language'`. */
  modalTitleDefault?: string
  /** Icon glyph to render before the current locale name. Defaults to `'globe'`. */
  icon?: IconName
  /** Pixel size for the rendered icon. Defaults to `16`. */
  iconSize?: number
  /**
   * What to render inside the trigger button: the locale's native name, its
   * code, or the icon alone. Defaults to `'name'`.
   */
  display?: 'name' | 'code' | 'icon'
  /** Optional render override: receives `open` and replaces the default trigger. */
  renderTrigger?: (open: () => void) => VNodeChild
}

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
      type: String as PropType<LanguagePickerProps['labelKey']>,
      default: 'footer.language',
    },
    labelDefault: {
      type: String as PropType<LanguagePickerProps['labelDefault']>,
      default: 'Language',
    },
    modalTitleKey: {
      type: String as PropType<LanguagePickerProps['modalTitleKey']>,
      default: 'languagePicker.modalTitle',
    },
    modalTitleDefault: {
      type: String as PropType<LanguagePickerProps['modalTitleDefault']>,
      default: 'Choose language',
    },
    icon: {
      type: String as PropType<LanguagePickerProps['icon']>,
      default: 'globe',
    },
    iconSize: {
      type: Number as PropType<LanguagePickerProps['iconSize']>,
      default: 16,
    },
    display: {
      type: String as PropType<LanguagePickerProps['display']>,
      default: 'name',
    },
    className: String as PropType<LanguagePickerProps['className']>,
    style: [String, Object] as PropType<LanguagePickerProps['style']>,
    renderTrigger: {
      type: Function as PropType<LanguagePickerProps['renderTrigger']>,
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
