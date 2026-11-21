/**
 * Angular wrapping chrome for an e-commerce app — the counterpart of
 * `@molecule/app-storefront-chrome-react`: announcement bar, top nav (cart +
 * profile dropdown), column-based footer, with the same props (React names)
 * and the same DOM for the same input.
 *
 * Stateless about auth and cart shape. Consumers wire up the live cart count
 * and auth state and bind them; the components stay compositional and reusable
 * across storefronts with different backends.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontTopNav,
 * } from '@molecule/app-storefront-chrome-angular'
 *
 * @Component({
 *   selector: 'app-storefront-shell',
 *   standalone: true,
 *   imports: [StorefrontAnnouncementBar, StorefrontTopNav],
 *   template: `
 *     <div mol-storefront-announcement-bar [cta]="{ to: '/', label: 'Shop now' }">
 *       Free shipping on orders over $75
 *     </div>
 *     <header
 *       mol-storefront-top-nav
 *       [links]="[{ to: '/', label: 'Shop', active: true }]"
 *       [isAuthenticated]="true"
 *     >
 *       <span slot="brand">Bazaar</span>
 *     </header>
 *   `,
 * })
 * export class StorefrontShell {}
 * ```
 *
 * @remarks
 * - Every link is the binding's `Link` directive (`<a molLink>`), react-router's
 *   `<Link to>` contract, so the components must render under
 *   `provideMolecule({ router })` — the same requirement as React's
 *   `react-router` peer dependency.
 * - `NavActionSpec.icon` is a Material Symbols LIGATURE name (`'shopping_cart'`):
 *   load the "Material Symbols Outlined" font in the host app or the nav shows
 *   raw words instead of icons.
 * - The account/sign-in menu (`authedMenu` when signed in, else
 *   `unauthedMenu`) ALWAYS renders and is reachable regardless of
 *   `profileImageUrl`. The avatar image is an optional enhancement: with no URL
 *   the trigger shows `profileInitials`, else a default avatar icon.
 * - `signOutLabel`, `profileImageAlt` and `accountMenuLabel` default to English
 *   strings; pass translated values (no companion locale bond ships).
 * - Node props are projected content: `[slot=brand]`, `[slot=message]`,
 *   `[slot=tagline]`, `[slot=copyright]`, `[slot=signOutLabel]`. A node inside a
 *   data prop (`links[].label`) is an `ng-template` reference.
 *
 * @module
 */

export * from './storefront-announcement-bar.component.js'
export * from './storefront-footer.component.js'
export * from './storefront-top-nav.component.js'
export * from './types.js'
