/**
 * Vendor / seller / agent profile card.
 *
 * Exports `VendorCard` — Avatar/logo + name + tagline + rating/review count
 * + member-since + badges + actions row, on the shared Card. It is the Svelte
 * counterpart of `@molecule/app-vendor-card-react`: same props and the same
 * DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { VendorCard } from '@molecule/app-vendor-card-svelte'
 *   import { Button } from '@molecule/app-ui-svelte'
 * </script>
 *
 * <VendorCard
 *   name="Acme Supplies"
 *   logoSrc="/logos/acme.png"
 *   description="Industrial parts, fast shipping"
 *   rating={4.7}
 *   reviewCount={312}
 *   memberSince="Jan 2021"
 *   onClick={() => console.log('open vendor page')}
 * >
 *   {#snippet badges()}
 *     <span>Verified</span>
 *   {/snippet}
 *   {#snippet actions()}
 *     <Button size="sm" onclick={() => console.log('follow')}>Follow</Button>
 *   {/snippet}
 * </VendorCard>
 * ```
 *
 * @remarks
 * Composes `Card` + `Avatar` from `@molecule/app-ui-svelte`. `onClick` makes
 * the whole card clickable but adds no keyboard handler or role — put primary
 * navigation in `actions` buttons for accessibility. `rating` renders a
 * single ★ plus the number (`toFixed(1)`), not a five-star row;
 * `reviewCount` renders only when `rating` is also set. When `name` is not a
 * plain string the Avatar alt falls back to hardcoded 'Vendor'. All text
 * slots (description, memberSince, badges, actions) are pre-translated — no
 * locale bond; React's node props arrive as snippets or plain strings.
 * Props (documented on the exported `VendorCardProps` interface): name,
 * logoSrc, description, rating, reviewCount, memberSince, badges, actions,
 * onClick, className.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
