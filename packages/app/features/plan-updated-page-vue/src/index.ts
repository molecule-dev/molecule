/**
 * Vue post-purchase confirmation page.
 *
 * Exports `PlanUpdated` — the Vue counterpart of
 * `@molecule/app-plan-updated-page-react` with the same props (React names)
 * and the same DOM for the same input: a thank-you headline plus a Return
 * Home button, rendered after the user completes a plan upgrade. It reads
 * auth state to show a spinner while the session is still hydrating, so the
 * page is safe to navigate to directly from a webhook redirect or a fresh
 * page load.
 *
 * **It also completes the purchase.** A hosted checkout returns the buyer
 * here with the payment id in the query
 * (`/plan-updated?provider=stripe&sessionId=…`), and this page confirms it
 * with `POST /users/:id/verify-payment/:provider` — a same-origin call, so
 * the session cookie applies. Route it at the path your API's
 * `PAYMENTS_PLAN_UPDATED_PATH` points to (default `/plan-updated`) and the
 * upgrade completes on the redirect instead of waiting on a webhook.
 *
 * @example
 * ```ts
 * // main.ts
 * import { createApp } from 'vue'
 * import { createRouter, createWebHistory } from 'vue-router'
 * import { PlanUpdated } from '@molecule/app-plan-updated-page-vue'
 *
 * import App from './App.vue'
 *
 * const router = createRouter({
 *   history: createWebHistory(),
 *   routes: [{ path: '/plan-updated', component: PlanUpdated }],
 * })
 *
 * createApp(App).use(router).mount('#app')
 * ```
 *
 * @example
 * ```vue
 * <!-- App.vue -->
 * <script setup lang="ts">
 * import { MoleculeRouterProvider } from '@molecule/app-routing-vue-router'
 * import { MoleculeProvider } from '@molecule/app-vue'
 *
 * import { authClient, i18nProvider } from './bonds/index.js'
 * </script>
 *
 * <template>
 *   <MoleculeRouterProvider>
 *     <MoleculeProvider :auth="authClient" :i18n="i18nProvider">
 *       <RouterView />
 *     </MoleculeProvider>
 *   </MoleculeRouterProvider>
 * </template>
 * ```
 *
 * @remarks
 * Requires a `MoleculeProvider` from `@molecule/app-vue` given the app's `auth`
 * client and `i18n` provider (`useAuth` drives the hydration spinner,
 * `useVerifyPaymentReturn` the confirmation call), inside the routing bond's
 * `MoleculeRouterProvider` (the page renders `Link`, so it needs the app's router).
 * The Vue scaffold mounts both in `src/App.vue`. Never
 * point a provider's `success_url` straight at the API's
 * `/api/users/:id/verify-payment/:provider`: that top-level redirect crosses
 * to a host the session cookie is not set for, so it answers 401 and the paid
 * plan is never granted — send the buyer to THIS page instead. While the
 * confirmation is in flight the page shows the spinner; if it fails it shows a
 * retry (`data-mol-id="plan-updated-retry"`) rather than a false thank-you.
 * Pass `verify={false}` only if some other path grants the plan. Keys
 * `planUpdated.message` / `planUpdated.thankYou` / `planUpdated.returnHome`
 * come from `@molecule/app-locales-common`; the "View receipt" link uses
 * `planUpdated.viewReceipt` from the companion bond
 * `@molecule/app-locales-plan-updated-page` and always navigates to
 * `/billing` — ensure that route exists.
 *
 * @module
 */

export * from './PlanUpdated.js'
export * from './types.js'
