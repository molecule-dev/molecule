/**
 * React announcement / promo bar.
 *
 * Exports `<AnnouncementBar>` — persistent top-of-page banner with icon,
 * message, optional action (link or button), and optional dismiss (×).
 * Long-lived and prominent, unlike a Toast; carries an action slot +
 * dismiss, unlike an Alert.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AnnouncementBar } from '@molecule/app-announcement-bar-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function UpdateBanner() {
 *   const { t } = useTranslation()
 *   const [visible, setVisible] = useState(true)
 *   return (
 *     <AnnouncementBar
 *       kind="info"
 *       icon={<span aria-hidden="true">🚀</span>}
 *       action={{ label: t('pwa.update', undefined, { defaultValue: 'Update' }), onClick: () => window.location.reload() }}
 *       visible={visible}
 *       onDismiss={() => setVisible(false)}
 *       dataMolId="update-bar"
 *     >
 *       {t('pwa.updateAvailable', undefined, { defaultValue: 'New version available!' })}
 *     </AnnouncementBar>
 *   )
 * }
 * ```
 *
 * @remarks
 * `kind` is exposed as a `data-kind` attribute on the root — it does NOT
 * change the bar's colors by itself; style per-kind via `className` or a
 * `[data-kind="…"]` selector. Dismissal is uncontrolled by default
 * (internal state; the bar stays hidden until remount) — pass `visible`
 * to control it, e.g. to persist dismissal per user. `dismissible`
 * defaults to `true`. There is no default `data-mol-id`; pass `dataMolId`
 * so agents/E2E can target the bar. Translations come from the companion
 * `@molecule/app-locales-announcement-bar` locale bond.
 *
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise), and
 * `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui`
 * ran at startup. Nothing is remembered across reloads — to keep a bar
 * dismissed, persist the flag yourself and feed it back through `visible`.
 * An `action` with `href` renders an `<a>` and ignores `onClick`.
 *
 * @module
 */

export * from './AnnouncementBar.js'
