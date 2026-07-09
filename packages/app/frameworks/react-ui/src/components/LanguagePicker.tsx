import { type ButtonHTMLAttributes, type JSX, type ReactNode, useState } from 'react'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './Icon.js'
import { Modal } from './Modal.js'

/**
 * Props for {@link LanguagePicker}.
 *
 * Extends standard `<button>` attributes so callers can pass any extra
 * `data-*`, `aria-*`, event handler, or `style` prop without forking the
 * component. The named props let apps customize the trigger label, icon,
 * size, and modal heading without spreading attribute concerns.
 */
export interface LanguagePickerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
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
   * What to render inside the trigger button.
   *
   * - `'name'` — globe icon + current locale's native name (e.g. `🌐 English`).
   *   This is the default; matches the molecule-dev footer pattern.
   * - `'code'` — globe icon + lowercase locale code (e.g. `🌐 en`). Useful in
   *   tight chrome where the long native name (e.g. "Bahasa Indonesia") would wrap.
   * - `'icon'` — globe icon only. Useful in icon-bar headers.
   */
  display?: 'name' | 'code' | 'icon'
  /** Optional className appended to the trigger button. */
  className?: string
  /** Optional render override: receives `{ open }` and replaces the default trigger. */
  renderTrigger?: (open: () => void) => ReactNode
}

/**
 * Globe-icon button that opens a modal grid of every locale registered
 * with the bonded i18n provider. Clicking a locale calls `setLocale`
 * and closes the modal.
 *
 * Reads `locale`, `setLocale`, and `locales` from {@link useTranslation},
 * so the list of choices stays in sync with whatever set the
 * `setupI18nDefault` (or any other i18n setup) registered. No hardcoded
 * language list — adding a locale to the i18n bond adds it to the picker.
 *
 * Molecule-convention defaults baked in:
 *
 * - `data-mol-id="language-picker-trigger"` on the trigger button
 * - `data-mol-id="language-picker-modal"` on the modal dialog
 * - `data-mol-id="language-picker-option-<code>"` on each locale button
 * - `data-active` on the currently-selected locale button
 * - `aria-label` from the `footer.language` i18n key (default `"Language"`)
 *
 * @param props - {@link LanguagePickerProps}
 */
export function LanguagePicker({
  labelKey = 'footer.language',
  labelDefault = 'Language',
  modalTitleKey = 'languagePicker.modalTitle',
  modalTitleDefault = 'Choose language',
  icon = 'globe',
  iconSize = 16,
  display = 'name',
  className,
  renderTrigger,
  ...rest
}: LanguagePickerProps = {}): JSX.Element {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const [open, setOpen] = useState(false)

  const ariaLabel = t(labelKey, {}, { defaultValue: labelDefault })
  const current = locales.find((l) => l.code === locale)
  const currentName = current?.name ?? locale

  const triggerLabel = display === 'icon' ? null : display === 'code' ? locale : currentName

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          data-mol-id="language-picker-trigger"
          aria-label={ariaLabel}
          onClick={() => setOpen(true)}
          className={cm.cn(cm.languagePickerTrigger, className)}
          {...rest}
        >
          <Icon name={icon} size={iconSize} />
          {triggerLabel != null ? <span>{triggerLabel}</span> : null}
        </button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(modalTitleKey, {}, { defaultValue: modalTitleDefault })}
        size="lg"
        data-mol-id="language-picker-modal"
      >
        <div className={cm.languageGrid}>
          {[...locales]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((l) => {
              const active = l.code === locale
              return (
                <button
                  key={l.code}
                  type="button"
                  data-mol-id={`language-picker-option-${l.code}`}
                  data-active={active || undefined}
                  aria-pressed={active}
                  onClick={async () => {
                    await setLocale(l.code)
                    setOpen(false)
                  }}
                  className={active ? cm.languageActive : cm.languageOption}
                >
                  {l.name}
                </button>
              )
            })}
        </div>
      </Modal>
    </>
  )
}
