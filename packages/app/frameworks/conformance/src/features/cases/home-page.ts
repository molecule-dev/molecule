/**
 * `@molecule/app-home-page-react` cases: the authenticated home page's
 * personalized greeting.
 *
 * `<Home />` takes no props and reads only auth and i18n, so the cases vary
 * the auth state (`name` → `email` → `home.world` fallback chain, every
 * status the fake auth client serves), a per-app `home.greeting` override
 * through the case translations, and the two outside changes the page must
 * follow reactively: a locale switch and an auth change. Auth changes drive
 * the binding kit's fake auth client, so every case mounts through the full
 * composition (`composition: 'app'`).
 *
 * @module
 */

import type { BindingContext } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** The signed-in user the auth fake serves. */
const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.test' }

/** The authenticated context the signed-in cases run with. */
const authed: BindingContext = { auth: { status: 'authenticated', user } }

/** `@molecule/app-home-page-react`. */
export const homePageFeature: FeatureCases = {
  package: '@molecule/app-home-page-react',
  composition: 'app',
  families: [
    {
      component: 'Home',
      cases: [
        { name: 'greets a named user by name', context: authed },
        {
          name: 'greets a user without a name by email',
          context: {
            auth: { status: 'authenticated', user: { id: 'u2', email: 'grace@example.test' } },
          },
        },
        {
          name: 'greets the world when the user has no name or email',
          context: { auth: { status: 'authenticated', user: { id: 'u3' } } },
        },
        {
          name: 'greets the world while signed out',
          context: { auth: { status: 'unauthenticated' } },
        },
        {
          name: 'greets the world while the session is loading',
          context: { auth: { status: 'loading' } },
        },
        {
          name: 'greets the world when the session is unavailable',
          context: { auth: { status: 'unavailable' } },
        },
        {
          name: 'renders a per-app greeting override',
          context: { ...authed, translations: { en: { home: { greeting: 'Welcome back, ' } } } },
        },
        {
          name: 're-renders the greeting on a locale switch',
          context: authed,
          interactions: [{ type: 'locale', code: 'en-XA' }],
        },
        {
          name: 'follows a sign-in from elsewhere',
          context: { auth: { status: 'loading' } },
          interactions: [
            {
              type: 'auth',
              status: 'authenticated',
              user: { id: 'u4', name: 'Grace Hopper', email: 'grace@example.test' },
            },
          ],
        },
        {
          name: 'follows a sign-out from elsewhere to the world greeting',
          context: authed,
          interactions: [{ type: 'auth', status: 'unauthenticated' }],
        },
        {
          name: 'follows another account signing in elsewhere',
          context: authed,
          interactions: [
            {
              type: 'auth',
              status: 'authenticated',
              user: { id: 'u5', name: 'Linus Torvalds', email: 'linus@example.test' },
            },
          ],
        },
      ],
    },
  ],
}
