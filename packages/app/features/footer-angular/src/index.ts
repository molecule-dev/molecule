/**
 * Angular app-shell footer — the counterpart of `@molecule/app-footer-react`:
 * the same props and the same DOM for the same input. About link, Privacy and
 * Terms surfaces (in-place modals or route links), a language-picker modal,
 * and the version display.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AppFooter } from '@molecule/app-footer-angular'
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [AppFooter],
 *   template: `
 *     <mol-app-footer
 *       [appName]="'Bearing'"
 *       [aboutHref]="'https://bearing.example'"
 *       [loadContent]="loadLegal"
 *     />
 *   `,
 * })
 * export class Shell {
 *   // Lazy-load the app's legal HTML into the i18n catalog before a modal opens.
 *   readonly loadLegal = async (key: 'privacyPolicy' | 'termsOfService'): Promise<void> => {}
 * }
 * ```
 *
 * @remarks
 * - Must render inside the binding's router (`provideRouter`) when it shows
 *   an internal About link or the `legalMode="route"` anchors — those are the
 *   binding's `Link` (`<a molLink>`, react-router's `<Link>` contract),
 *   which throws outside one, as react-router's does — and inside the
 *   binding's i18n (`provideI18n` or `provideMolecule`) for `useTranslation()`.
 *   Styling needs a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`);
 *   version display works unbonded (the version core falls back to a web
 *   provider).
 * - The privacy/terms modals render whatever HTML the i18n catalog holds under
 *   `content.privacyPolicy` / `content.termsOfService` as raw HTML — the same
 *   trust model as React's `dangerouslySetInnerHTML` (the `[innerHTML]`
 *   binding bypasses the sanitizer for exactly this content). The `appName`
 *   interpolated into that HTML is HTML-escaped first, so a markup-carrying
 *   app name arrives as inert entities. Those keys are EMPTY by default (the
 *   app supplies its real legal HTML); until it does, the modal shows the
 *   `footer.legalNotConfigured` placeholder instead of a silently-blank modal —
 *   no fabricated legal text is ever shipped.
 * - The language picker lists every locale registered on the i18n provider,
 *   sorted by name; picking one switches the locale and closes the modal.
 *
 * @module
 */

export * from './app-footer.component.js'
export * from './types.js'
