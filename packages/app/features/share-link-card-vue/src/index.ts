/**
 * Vue share-link card.
 *
 * Exports `<ShareLinkCard>` — a read-only URL field with a copy button, an
 * optional title/description header, a QR slot, and an optional
 * password-protect toggle. It is the Vue counterpart of
 * `@molecule/app-share-link-card-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { moleculePlugin } from '@molecule/app-vue'
 * import { ShareLinkCard } from '@molecule/app-share-link-card-vue'
 *
 * const SharePanel = defineComponent({
 *   setup() {
 *     const passwordEnabled = ref(false)
 *     return () =>
 *       h(ShareLinkCard, {
 *         title: 'Share this project',
 *         description: 'Anyone with the link can view.',
 *         url: 'https://app.example.com/p/abc123',
 *         passwordProtect: {
 *           enabled: passwordEnabled.value,
 *           onChange: (enabled: boolean) => (passwordEnabled.value = enabled),
 *         },
 *       })
 *   },
 * })
 *
 * const app = createApp(SharePanel)
 * app.use(moleculePlugin, { i18n: i18nProvider })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * - QR rendering is slot-based: pass BOTH `qr` and `showQR` — `qr` alone
 *   renders nothing. `qr` may be a prop value or the same-named slot.
 * - The title, description and password label are node-valued; each may be
 *   passed as a prop or as the same-named slot.
 * - Copy goes through `copyTextWithFallback()` from `@molecule/app-clipboard`:
 *   the bonded clipboard provider first, then the legacy copy command. The
 *   "Copied!" feedback appears only when a copy actually happened — copy never
 *   throws, so a blocked clipboard leaves the label unchanged.
 * - The password toggle is UI-only: persisting and enforcing the password is
 *   the app/server's job.
 * - Requires a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`) and the
 *   bonded i18n provider. Translations: `@molecule/app-locales-share-link-card`.
 *
 * @module
 */

export * from './ShareLinkCard.js'
export * from './types.js'
