/**
 * Vue announcement / promo bar.
 *
 * Exports `<AnnouncementBar>` — persistent top-of-page banner with icon,
 * message, optional action (link or button), and optional dismiss (×).
 * Long-lived and prominent, unlike a Toast; carries an action slot +
 * dismiss, unlike an Alert. It is the Vue counterpart of
 * `@molecule/app-announcement-bar-react`: same props (React names), same DOM
 * for the same input, same ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { moleculePlugin } from '@molecule/app-vue'
 * import { AnnouncementBar } from '@molecule/app-announcement-bar-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         AnnouncementBar,
 *         {
 *           kind: 'promo',
 *           icon: h('span', {}, '🎉'),
 *           action: { label: 'Learn more', href: '/pricing' },
 *           onDismiss: () => console.log('dismissed'),
 *           dataMolId: 'promo-bar',
 *         },
 *         { default: () => ['New Pro plan — 3 months free for early adopters.'] },
 *       )
 *   },
 * })
 *
 * const app = createApp(App)
 * app.use(moleculePlugin, { i18n: i18nProvider })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * `kind` is exposed as a `data-kind` attribute on the root — it does NOT
 * change the bar's colors by itself; style per-kind via `className` or a
 * `[data-kind="…"]` selector. Dismissal is uncontrolled by default
 * (internal state; the bar stays hidden until remount) — pass `visible`
 * to control it, e.g. to persist dismissal per user. `dismissible`
 * defaults to `true`. There is no default `data-mol-id`; pass `dataMolId`
 * so agents/E2E can target the bar. Node-valued props arrive as a prop AND
 * a same-named slot; components accept either. Translations come from the
 * companion `@molecule/app-locales-announcement-bar` locale bond.
 *
 * @module
 */

export * from './AnnouncementBar.js'
export * from './types.js'
