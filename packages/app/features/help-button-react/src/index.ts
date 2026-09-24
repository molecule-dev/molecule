/**
 * Floating / inline help button — a circular button for launching help,
 * support chat, or docs. Fixed bottom-corner positioning by default;
 * `position="inline"` renders a normal in-flow button.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { HelpButton } from '@molecule/app-help-button-react'
 * import { useTranslation } from '@molecule/app-react'
 * import { getClassMap } from '@molecule/app-ui'
 * import { Modal } from '@molecule/app-ui-react'
 *
 * export function SupportLauncher() {
 *   const cm = getClassMap()
 *   const { t } = useTranslation()
 *   const [open, setOpen] = useState(false)
 *   const [seen, setSeen] = useState(false)
 *   return (
 *     <>
 *       <HelpButton
 *         position="bottom-right"
 *         hasNotification={!seen}
 *         className={cm.cn(cm.surface, cm.shadowLifted)}
 *         onClick={() => {
 *           setOpen(true)
 *           setSeen(true)
 *         }}
 *       />
 *       <Modal
 *         open={open}
 *         onClose={() => setOpen(false)}
 *         title={t('helpButton.label', undefined, { defaultValue: 'Help' })}
 *       >
 *         <a href="https://docs.example.com">docs.example.com</a>
 *       </Modal>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It does NOT open anything itself — no built-in panel, chat or modal.
 *   Wire `onClick` to your own state (e.g. a `Modal` from
 *   `@molecule/app-ui-react`), or pass `href` for a plain link.
 * - The button ships with NO surface styling of its own (no background,
 *   border, or shadow) — pass `className` built from ClassMap tokens (e.g.
 *   `cm.cn(cm.surface, cm.shadowLifted)`) or it renders as a bare "?"
 *   floating over the page. Never pass raw CSS class names.
 * - `hasNotification` is a controlled boolean — the dot does NOT clear on
 *   click; flip it yourself.
 * - `useTranslation()` supplies the default aria-label (`helpButton.label`
 *   via `@molecule/app-locales-help-button`) and THROWS outside
 *   `@molecule/app-react`'s `I18nProvider`; `getClassMap()` needs a bonded
 *   ClassMap. Pass `label` to skip i18n for the aria-label.
 * - `href` and `onClick` are mutually exclusive — `href` wins and renders an
 *   `<a>`; there is no `target="_blank"` handling, add your own anchor if you
 *   need one.
 *
 * @module
 */

export * from './HelpButton.js'
