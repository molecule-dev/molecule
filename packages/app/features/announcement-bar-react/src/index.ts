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
 * import { AnnouncementBar } from '@molecule/app-announcement-bar-react'
 *
 * <AnnouncementBar
 *   kind="promo"
 *   icon={<span>🎉</span>}
 *   action={{ label: 'Learn more', href: '/pricing' }}
 *   onDismiss={() => console.log('dismissed')}
 *   dataMolId="promo-bar"
 * >
 *   New Pro plan — 3 months free for early adopters.
 * </AnnouncementBar>
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
 * @module
 */

export * from './AnnouncementBar.js'
