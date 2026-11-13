/**
 * LanguagePicker component — a globe trigger that opens a locale grid.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, Show, splitProps } from 'solid-js'

import type { LocaleConfig } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'
import { Icon } from './Icon.jsx'
import { Modal } from './Modal.jsx'

/**
 * Props for {@link LanguagePicker}.
 *
 * Extends standard `<button>` attributes so callers can pass any extra
 * `data-*`, `aria-*`, event handler, or `style` prop without forking the
 * component. The named props let apps customize the trigger label, icon,
 * size, and modal heading without spreading attribute concerns.
 */
export interface LanguagePickerProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'type' | 'children'
> {
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
   * What to render inside the trigger button: the locale's native name
   * (`'name'`, the default), its lowercase code (`'code'`), or the icon alone
   * (`'icon'`).
   */
  display?: 'name' | 'code' | 'icon'
  /** Optional className appended to the trigger button. */
  className?: string
  /** Optional render override: receives `{ open }` and replaces the default trigger. */
  renderTrigger?: (open: () => void) => JSX.Element
}

/**
 * Globe-icon button that opens a modal grid of every locale registered with
 * the bonded i18n provider. Clicking a locale calls `setLocale` and closes
 * the modal.
 *
 * @param props - Component props (see {@link LanguagePickerProps}).
 * @returns The trigger and its locale modal.
 */
export const LanguagePicker: Component<LanguagePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'labelKey',
    'labelDefault',
    'modalTitleKey',
    'modalTitleDefault',
    'icon',
    'iconSize',
    'display',
    'className',
    'renderTrigger',
    'style',
  ])

  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const [open, setOpen] = createSignal(false)

  const ariaLabel = (): string =>
    t(local.labelKey ?? 'footer.language', {}, { defaultValue: local.labelDefault ?? 'Language' })
  const current = (): LocaleConfig | undefined => locales().find((entry) => entry.code === locale())
  const currentName = (): string => current()?.name ?? locale()
  const triggerLabel = (): string | null =>
    (local.display ?? 'name') === 'icon'
      ? null
      : (local.display ?? 'name') === 'code'
        ? locale()
        : currentName()
  const sortedLocales = (): LocaleConfig[] =>
    [...locales()].sort((a, b) => a.name.localeCompare(b.name))

  // React reconciles the locale buttons by `key={l.code}`: a locale's node
  // survives an update whose key is unchanged and moves on a reorder.
  // `<For>` keys by object identity, so the render iterates the KEYS and reads
  // each locale through the lookup.
  const sortedLocaleKeys = createKeyedList(sortedLocales, (entry) => entry.code)

  return (
    <>
      <Show when={!local.renderTrigger}>
        <button
          type="button"
          data-mol-id="language-picker-trigger"
          aria-label={ariaLabel()}
          onClick={() => setOpen(true)}
          class={cm.cn(cm.languagePickerTrigger, local.className)}
          style={toStyleProps(local.style)}
          {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <Icon name={local.icon ?? 'globe'} size={local.iconSize ?? 16} />
          <Show when={triggerLabel() != null}>
            <span>{triggerLabel()}</span>
          </Show>
        </button>
      </Show>
      <Show when={local.renderTrigger}>{local.renderTrigger?.(() => setOpen(true))}</Show>
      <Modal
        open={open()}
        onClose={() => setOpen(false)}
        title={t(
          local.modalTitleKey ?? 'languagePicker.modalTitle',
          {},
          {
            defaultValue: local.modalTitleDefault ?? 'Choose language',
          },
        )}
        size="lg"
        data-mol-id="language-picker-modal"
      >
        <div class={cm.languageGrid}>
          <For each={sortedLocaleKeys.keys()}>
            {(key) => {
              const entry = (): LocaleConfig => sortedLocaleKeys.get(key)!
              const active = (): boolean => entry().code === locale()
              return (
                <button
                  type="button"
                  data-mol-id={`language-picker-option-${entry().code}`}
                  data-active={active() || undefined}
                  aria-pressed={active()}
                  onClick={async () => {
                    await setLocale(entry().code)
                    setOpen(false)
                  }}
                  class={active() ? cm.languageActive : cm.languageOption}
                >
                  {entry().name}
                </button>
              )
            }}
          </For>
        </div>
      </Modal>
    </>
  )
}
