/**
 * Cases for the auth flow hooks: login, signup, password change and reset,
 * OAuth (redirect, popup relay and callback), the profile form and the
 * post-checkout payment verification.
 *
 * @module
 */

import type { HookCases, HookStep } from '../spec.js'

/** Calls `name` on the result with optional arguments. */
const call = (method: string, ...args: unknown[]): HookStep => ({
  type: 'call',
  method,
  ...(args.length === 0 ? {} : { args }),
})

/** Runs one area control (see `fakes/auth-flows.ts`). */
const control = (name: string, ...args: unknown[]): HookStep => ({
  type: 'control',
  name,
  ...(args.length === 0 ? {} : { args }),
})

/** The values shape of the profile-form cases: two editable text fields. */
interface ProfileValues {
  name: string
  bio: string
}

/**
 * Maps an auth user to profile-form values (the case's `toValues`). A real
 * pure function, not a `{ $fn }` spy: the mapped values must follow the user
 * the hook hands it, which a constant-returning spy cannot express. It is
 * deterministic — a pure function of a recorded argument.
 */
const toProfileValues = (user: unknown): ProfileValues => {
  const record = (user ?? {}) as { name?: unknown; bio?: unknown }
  return {
    name: typeof record.name === 'string' ? record.name : '',
    bio: typeof record.bio === 'string' ? record.bio : '',
  }
}

/**
 * The case's `toPatch`: passes only the changed fields through, unchanged —
 * the "only changed fields" contract is asserted by the recorded
 * `auth.updateProfile` call this produces.
 */
const toProfilePatch = (changes: Partial<ProfileValues>): Partial<ProfileValues> => ({
  ...changes,
})

/**
 * Hook arguments for a profile form over `name`/`bio`.
 *
 * @param extra - Fields to add or replace (a `validate`, a `getIdentity`, …).
 * @returns The single `options` argument for `useProfileForm`.
 */
const profileFormOptions = (extra: Record<string, unknown> = {}): unknown[] => [
  {
    defaultValues: { name: '', bio: '' },
    toValues: toProfileValues,
    toPatch: toProfilePatch,
    onSaved: { $fn: 'onSaved' },
    ...extra,
  },
]

/** `useLogin()`: tracked login state over the auth client. */
export const useLoginCases: HookCases = {
  hook: 'useLogin',
  cases: [
    { name: 'idle until a login runs' },
    {
      name: 'a successful login resolves with the session',
      steps: [call('login', { email: 'a@b.c', password: 'pw' })],
    },
    {
      name: 'a failed login keeps the error and clears loading',
      context: { authErrors: { login: 'Invalid credentials' } },
      steps: [call('login', { email: 'a@b.c', password: 'bad' })],
    },
    {
      name: 'a login stays pending until the exchange settles',
      context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
      steps: [
        call('login', { email: 'a@b.c', password: 'pw', remember: true }),
        control('authFlows.settleAuth', 'login', 'resolve'),
      ],
    },
    {
      name: 'the latest login wins when two overlap',
      context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
      steps: [
        call('login', { email: 'a@b.c', password: 'one' }),
        call('login', { email: 'b@b.c', password: 'two' }),
        control('authFlows.settleAuth', 'login', 'resolve'),
        control('authFlows.settleAuth', 'login', 'resolve'),
      ],
    },
    {
      name: 'a settled rejection reaches the error state',
      context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
      steps: [
        call('login', { email: 'a@b.c', password: 'bad' }),
        control('authFlows.settleAuth', 'login', 'reject', 'Wrong password'),
      ],
    },
    {
      name: 'reset clears a settled login',
      steps: [
        call('login', { email: 'a@b.c', password: 'pw' }),
        call('reset'),
        call('login', { email: 'a@b.c', password: 'pw' }),
      ],
    },
    {
      // `login`/`reset` depend only on the client, so a locale switch's
      // re-render must not rebuild them.
      name: 'login and reset keep their identity across an unrelated re-render',
      steps: [
        { type: 'stable', methods: ['login', 'reset'] },
        { type: 'locale', locale: 'fr' },
        { type: 'stable', methods: ['login', 'reset'] },
      ],
    },
    {
      name: 'reset while a login is pending does not stop its result landing',
      context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
      steps: [
        call('login', { email: 'a@b.c', password: 'pw' }),
        call('reset'),
        control('authFlows.settleAuth', 'login', 'resolve'),
      ],
    },
    {
      name: 'unmount while a login is pending keeps the settle silent',
      context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
      steps: [
        call('login', { email: 'a@b.c', password: 'pw' }),
        { type: 'unmount' },
        control('authFlows.settleAuth', 'login', 'resolve'),
      ],
    },
    {
      // The whole flow-hook family routes through `useAuthClient`; one case
      // here pins the throw for all of them (signup/changePassword/reset call
      // the same accessor before anything else).
      name: 'throws without the auth provider',
      context: { omitServices: ['auth'] },
    },
  ],
}

/** `useSignup()`: tracked registration state over the auth client. */
export const useSignupCases: HookCases = {
  hook: 'useSignup',
  cases: [
    { name: 'idle until a signup runs' },
    {
      name: 'a successful signup resolves with the new user',
      steps: [call('signup', { email: 'a@b.c', password: 'pw', name: 'A' })],
    },
    {
      name: 'extra registration fields pass through',
      steps: [call('signup', { email: 'a@b.c', password: 'pw', username: 'ada' })],
    },
    {
      name: 'a failed signup keeps the error',
      context: { authErrors: { register: 'Email taken' } },
      steps: [call('signup', { email: 'a@b.c', password: 'pw' })],
    },
    {
      name: 'a signup stays pending until the register call settles',
      context: { areas: { authFlows: { auth: { defer: ['register'] } } } },
      steps: [
        call('signup', { email: 'a@b.c', password: 'pw' }),
        control('authFlows.settleAuth', 'register', 'resolve'),
      ],
    },
    {
      name: 'the latest signup wins when two overlap',
      context: { areas: { authFlows: { auth: { defer: ['register'] } } } },
      steps: [
        call('signup', { email: 'a@b.c', password: 'one' }),
        call('signup', { email: 'b@b.c', password: 'two' }),
        control('authFlows.settleAuth', 'register', 'resolve'),
        control('authFlows.settleAuth', 'register', 'resolve'),
      ],
    },
    {
      name: 'unmount while a signup is pending keeps the settle silent',
      context: { areas: { authFlows: { auth: { defer: ['register'] } } } },
      steps: [
        call('signup', { email: 'a@b.c', password: 'pw' }),
        { type: 'unmount' },
        control('authFlows.settleAuth', 'register', 'resolve'),
      ],
    },
    {
      name: 'reset clears a settled signup',
      steps: [call('signup', { email: 'a@b.c', password: 'pw' }), call('reset')],
    },
  ],
}

/** `useChangePassword()`: tracked password change over the auth client. */
export const useChangePasswordCases: HookCases = {
  hook: 'useChangePassword',
  cases: [
    { name: 'idle until a change runs' },
    {
      name: 'a successful change resolves',
      steps: [call('changePassword', 'old-secret', 'new-secret')],
    },
    {
      name: 'a failed change keeps the error',
      context: { authErrors: { changePassword: 'Wrong password' } },
      steps: [call('changePassword', 'bad-old', 'new-secret')],
    },
    {
      name: 'a change stays pending until the client settles',
      context: { areas: { authFlows: { auth: { defer: ['changePassword'] } } } },
      steps: [
        call('changePassword', 'old-secret', 'new-secret'),
        control('authFlows.settleAuth', 'changePassword', 'resolve'),
      ],
    },
    {
      name: 'unmount while a change is pending keeps the settle silent',
      context: { areas: { authFlows: { auth: { defer: ['changePassword'] } } } },
      steps: [
        call('changePassword', 'old-secret', 'new-secret'),
        { type: 'unmount' },
        control('authFlows.settleAuth', 'changePassword', 'resolve'),
      ],
    },
    {
      name: 'reset clears a failed change',
      context: { authErrors: { changePassword: 'Wrong password' } },
      steps: [call('changePassword', 'bad-old', 'new-secret'), call('reset')],
    },
  ],
}

/** `usePasswordReset()`: the request and confirm halves, tracked separately. */
export const usePasswordResetCases: HookCases = {
  hook: 'usePasswordReset',
  cases: [
    { name: 'both halves start idle' },
    {
      name: 'requestReset sends the email',
      steps: [call('requestReset', { email: 'a@b.c' })],
    },
    {
      name: 'confirmReset submits the token and password',
      steps: [call('confirmReset', { token: 'reset-token', password: 'new-secret' })],
    },
    {
      name: 'a failed request keeps requestError only',
      context: { authErrors: { requestPasswordReset: 'No such account' } },
      steps: [
        call('requestReset', { email: 'a@b.c' }),
        call('confirmReset', { token: 'reset-token', password: 'new-secret' }),
      ],
    },
    {
      name: 'a failed confirm keeps confirmError only',
      context: { authErrors: { confirmPasswordReset: 'Token expired' } },
      steps: [
        call('requestReset', { email: 'a@b.c' }),
        call('confirmReset', { token: 'stale-token', password: 'new-secret' }),
      ],
    },
    {
      name: 'reset clears both halves',
      context: {
        authErrors: {
          requestPasswordReset: 'No such account',
          confirmPasswordReset: 'Token expired',
        },
      },
      steps: [
        call('requestReset', { email: 'a@b.c' }),
        call('confirmReset', { token: 'stale-token', password: 'new-secret' }),
        call('reset'),
      ],
    },
    {
      name: 'the request and confirm halves track independently while pending',
      context: {
        areas: { authFlows: { auth: { defer: ['requestPasswordReset', 'confirmPasswordReset'] } } },
      },
      steps: [
        call('requestReset', { email: 'a@b.c' }),
        call('confirmReset', { token: 'reset-token', password: 'new-secret' }),
        control('authFlows.settleAuth', 'requestPasswordReset', 'resolve'),
        control('authFlows.settleAuth', 'confirmPasswordReset', 'resolve'),
      ],
    },
    {
      name: 'unmount while a confirm is pending keeps the settle silent',
      context: {
        areas: { authFlows: { auth: { defer: ['confirmPasswordReset'] } } },
      },
      steps: [
        call('confirmReset', { token: 'reset-token', password: 'new-secret' }),
        { type: 'unmount' },
        control('authFlows.settleAuth', 'confirmPasswordReset', 'resolve'),
      ],
    },
  ],
}

/** `useOAuth()`: provider list, URL building, redirect, popup relay and callback. */
export const useOAuthCases: HookCases = {
  hook: 'useOAuth',
  cases: [
    { name: 'no providers by default' },
    {
      name: 'lists the configured providers',
      args: [{ oauthProviders: ['google', 'github'] }],
    },
    {
      // Safe under both re-render and re-mount semantics: `providers` is read
      // from the config alone, so a fresh mount shows the same list.
      name: 'providers follow a changed config',
      args: [{ oauthProviders: ['github'] }],
      steps: [{ type: 'args', args: [{ oauthProviders: ['google', 'github'] }] }],
    },
    {
      name: 'getOAuthUrl builds and encodes the provider url',
      args: [{ baseURL: 'https://api.test', oauthProviders: ['github'] }],
      steps: [call('getOAuthUrl', 'github'), call('getOAuthUrl', 'go ogle/x')],
    },
    {
      name: 'getOAuthUrl uses a custom oauth endpoint',
      args: [{ baseURL: 'https://api.test', oauthEndpoint: '/auth/oauth' }],
      steps: [call('getOAuthUrl', 'google')],
    },
    {
      // The `navigate` option receives the page navigation, so the target is
      // comparable (jsdom drops a real `window.location.href` assignment).
      name: 'redirect stashes the provider and navigates to it',
      args: [{ oauthProviders: ['github'], navigate: { $fn: 'navigate' } }],
      context: {
        areas: { authFlows: { location: { pathname: '/' }, sessionStorage: {} } },
      },
      steps: [call('redirect', 'github')],
    },
    {
      name: 'redirect from a nested page carries the return path',
      args: [{ oauthProviders: ['github'], navigate: { $fn: 'navigate' } }],
      context: {
        areas: { authFlows: { location: { pathname: '/account/login' }, sessionStorage: {} } },
      },
      steps: [call('redirect', 'github')],
    },
    {
      name: 'a code in the url with no stashed provider does nothing',
      args: [{ onError: { $fn: 'onError' } }],
      context: {
        areas: { authFlows: { location: { search: '?code=c1&state=s1' }, sessionStorage: {} } },
      },
    },
    {
      name: 'a full-page callback exchanges the code for a session',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', defer: true }],
          },
        },
      },
      steps: [
        control(
          'authFlows.answerFetch',
          200,
          { user: { id: 'u1', name: 'A' } },
          { authorization: 'Bearer tok-1' },
        ),
      ],
    },
    {
      name: 'a failed exchange reports the API error',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=bad&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', status: 400, data: { error: 'invalid code' } }],
          },
        },
      },
    },
    {
      name: 'an exchange failure without a reason reports the generic failure',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=bad&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', status: 400, data: {} }],
          },
        },
      },
    },
    {
      name: 'a network failure during the exchange reports the error',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', networkError: 'offline' }],
          },
        },
      },
    },
    {
      name: 'the token also arrives in the set-authorization header',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [
              {
                url: '/users/log-in/oauth',
                status: 200,
                data: { user: { id: 'u1' } },
                headers: { 'set-authorization': 'Bearer tok-h' },
              },
            ],
          },
        },
      },
    },
    {
      name: 'the user can arrive as props',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [
              {
                url: '/users/log-in/oauth',
                status: 200,
                data: { props: { id: 'u1', name: 'P' } },
                headers: { authorization: 'Bearer tok-p' },
              },
            ],
          },
        },
      },
    },
    {
      name: 'an exchange without a token or user fails the login',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', status: 200, data: {} }],
          },
        },
      },
    },
    {
      name: 'the popup callback relays the result to the opener',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=c1&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [
              {
                url: '/users/log-in/oauth',
                status: 200,
                data: { user: { id: 'u1' } },
                headers: { authorization: 'Bearer tok-9' },
              },
            ],
            window: { name: 'molecule-oauth-popup', opener: true },
          },
        },
      },
    },
    {
      name: 'a failed popup callback relays the error to the opener',
      args: [{ onSuccess: { $fn: 'onSuccess' }, onError: { $fn: 'onError' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/oauth/callback', search: '?code=bad&state=s1' },
            sessionStorage: { oauth_provider: 'github' },
            fetch: [{ url: '/users/log-in/oauth', status: 400, data: { error: 'bad state' } }],
            window: { name: 'molecule-oauth-popup', opener: true },
          },
        },
      },
    },
    {
      // A started flow outlives the host (useOAuth's module doc): the case ends
      // with the flow open, so `window.message: 1` is still subscribed until
      // the popup closes, relays or times out.
      name: 'loginViaPopup opens a named popup and waits',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [call('loginViaPopup', 'github')],
    },
    {
      name: 'a blocked popup falls back to a redirect',
      // The fallback goes through `navigate`, and NO popup listener is
      // registered, so no relay can arrive.
      fakeTimers: true,
      args: [{ oauthProviders: ['github'], navigate: { $fn: 'navigate' } }],
      context: {
        areas: {
          authFlows: {
            location: { pathname: '/login' },
            sessionStorage: {},
            popup: { blocked: true },
          },
        },
      },
      steps: [call('loginViaPopup', 'github')],
    },
    {
      name: 'a successful relay establishes the session in place',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', { ok: true, token: 'tok-3', user: { id: 'u1' } }),
      ],
    },
    {
      name: 'a second relay after a settled one changes nothing',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', { ok: true, token: 'tok-3', user: { id: 'u1' } }),
        control('authFlows.message', { ok: true, token: 'tok-9', user: { id: 'u2' } }),
      ],
    },
    {
      name: 'a relay without a user fails the login',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', { ok: true, token: 'tok-3' }),
      ],
    },
    {
      name: 'a failed relay reports the popups error',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', { ok: false, error: 'denied' }),
      ],
    },
    {
      name: 'a failed relay without a message reports the generic failure',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [call('loginViaPopup', 'github'), control('authFlows.message', { ok: false })],
    },
    {
      name: 'a relay from another origin is ignored',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', {
          ok: true,
          token: 'tok-3',
          user: { id: 'u1' },
          origin: 'foreign',
        }),
      ],
    },
    {
      name: 'a relay from another window is ignored',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', {
          ok: true,
          token: 'tok-3',
          user: { id: 'u1' },
          from: 'stranger',
        }),
      ],
    },
    {
      name: 'a message of another type is ignored',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.message', {
          ok: true,
          token: 'tok-3',
          user: { id: 'u1' },
          type: 'wrong',
        }),
      ],
    },
    {
      name: 'the opener stops waiting when the user closes the popup',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        control('authFlows.closePopup'),
        { type: 'advance', ms: 500 },
      ],
    },
    {
      name: 'a wedged popup is closed by the hard timeout',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [call('loginViaPopup', 'github'), { type: 'advance', ms: 300000 }],
    },
    {
      // Ends mid-flow, so like 'loginViaPopup opens a named popup and waits'
      // the message listener is still subscribed after unmount.
      name: 'a second loginViaPopup focuses the open popup',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [call('loginViaPopup', 'github'), call('loginViaPopup', 'google')],
    },
    {
      // The user did sign in, so the session is still established on the
      // shared auth client; onSuccess belongs to the unmounted view and is not
      // called.
      name: 'a relay after unmount establishes the session without calling onSuccess',
      fakeTimers: true,
      args: [
        {
          oauthProviders: ['github'],
          onSuccess: { $fn: 'onSuccess' },
          onError: { $fn: 'onError' },
        },
      ],
      context: {
        areas: { authFlows: { location: { pathname: '/login' }, sessionStorage: {}, popup: {} } },
      },
      steps: [
        call('loginViaPopup', 'github'),
        { type: 'unmount' },
        control('authFlows.message', { ok: true, token: 'tok-4', user: { id: 'u1' } }),
      ],
    },
  ],
}

/** `useProfileForm()`: load → edit → submit → publish over the shared user. */
export const useProfileFormCases: HookCases = {
  hook: 'useProfileForm',
  cases: [
    {
      name: 'not ready before the user loads',
      args: profileFormOptions(),
      steps: [call('getValue', 'name')],
    },
    {
      // No user: submit resolves undefined without validating, patching or
      // saving — the guard runs before everything else.
      name: 'a submit before the user loads does nothing',
      args: profileFormOptions(),
      steps: [call('submit')],
    },
    {
      name: 'hydrates from the signed-in user',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
    },
    {
      // No args step is involved: the late user arrives through the auth
      // service while the same form instance stays mounted.
      name: 'a late user does not erase dirty fields',
      args: profileFormOptions(),
      steps: [
        call('setValue', 'name', 'Mine'),
        { type: 'auth', status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } },
      ],
    },
    {
      name: 'getIdentity receives each user and a change of account rebases',
      args: profileFormOptions({ getIdentity: { $fn: 'getIdentity', returns: 'acct-1' } }),
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } },
        { type: 'auth', status: 'authenticated', user: { id: 'u2', name: 'C', bio: 'D' } },
      ],
    },
    {
      name: 'toPatch receives only changed fields',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [call('setValue', 'name', 'B'), call('submit')],
    },
    {
      name: 'a submit with no changes skips the API and onSaved',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [call('submit')],
    },
    {
      name: 'a failed save keeps the edits and sets error',
      args: profileFormOptions(),
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } },
        authErrors: { updateProfile: 'Save failed' },
      },
      steps: [call('setValue', 'name', 'B'), call('submit')],
    },
    {
      name: 'a validation failure blocks the save',
      args: profileFormOptions({
        validate: { $fn: 'formValidate', returns: { bio: 'Bio required' } },
      }),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [call('submit')],
    },
    {
      name: 'a submit is discarded when the account changes mid-validation',
      args: profileFormOptions({ validate: { $fn: 'formValidate', defer: true } }),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [
        call('setValue', 'name', 'B'),
        call('submit'),
        { type: 'auth', status: 'authenticated', user: { id: 'u2', name: 'C', bio: 'D' } },
        { type: 'settle', fn: 'formValidate', value: {} },
      ],
    },
    {
      name: 'a second submit while one is saving shares it',
      args: profileFormOptions(),
      context: {
        areas: {
          authFlows: {
            auth: {
              status: 'authenticated',
              user: { id: 'u1', name: 'A', bio: 'B' },
              defer: ['updateProfile'],
            },
          },
        },
      },
      steps: [
        call('setValue', 'name', 'B'),
        call('submit'),
        call('submit'),
        control('authFlows.settleAuth', 'updateProfile', 'resolve'),
      ],
    },
    {
      name: 'edits made while saving stay dirty',
      args: profileFormOptions(),
      context: {
        areas: {
          authFlows: {
            auth: {
              status: 'authenticated',
              user: { id: 'u1', name: 'A', bio: 'B' },
              defer: ['updateProfile'],
            },
          },
        },
      },
      steps: [
        call('setValue', 'name', 'B2'),
        call('submit'),
        call('setValue', 'bio', 'late edit'),
        control('authFlows.settleAuth', 'updateProfile', 'resolve'),
      ],
    },
    {
      name: 'a field the save transforms returns clean',
      args: [
        {
          defaultValues: { name: '', bio: '' },
          toValues: toProfileValues,
          toPatch: toProfilePatch,
          onSaved: { $fn: 'onSaved' },
        },
      ],
      context: {
        areas: {
          authFlows: {
            auth: {
              status: 'authenticated',
              user: { id: 'u1', name: 'A', bio: 'B' },
              updateProfileReturns: { id: 'u1', name: 'A', bio: 'CLEARED' },
            },
          },
        },
      },
      steps: [call('setValue', 'bio', 'X'), call('submit')],
    },
    {
      // Runs on this area's auth client: the kit's base fake bumps the session
      // revision on every updateProfile, which the real client does not, and
      // that bump makes the hook treat the save as an account change (clearing
      // the pending propagation this case retries).
      name: 'a failed onSaved retries without repeating the save',
      args: profileFormOptions({ onSaved: { $fn: 'onSaved', defer: true } }),
      context: {
        areas: {
          authFlows: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
        },
      },
      steps: [
        call('setValue', 'name', 'B'),
        call('submit'),
        { type: 'settle', fn: 'onSaved', error: 'cache down' },
        call('submit'),
        { type: 'settle', fn: 'onSaved' },
      ],
    },
    {
      name: 'reset restores the loaded baseline',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [call('setValue', 'name', 'Z'), call('reset')],
    },
    {
      // The owner leaves (signed out elsewhere): the edits are discarded, the
      // form returns to its defaults and `ready` drops — no save runs.
      name: 'signing out returns the form to its defaults',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [call('setValue', 'name', 'Z'), { type: 'auth', status: 'unauthenticated' }],
    },
    {
      name: 'field and form helpers',
      args: profileFormOptions(),
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A', bio: 'B' } } },
      steps: [
        call('register', 'name'),
        call('getError', 'name'),
        call('setError', 'name', 'bad'),
        call('clearErrors'),
        call('updateValues', { name: 'Q' }),
        call('asState'),
        call('asState', 'name'),
        call('validate'),
        call('handleSubmit', { $fn: 'onFormSubmit' }),
      ],
    },
    {
      name: 'unmount while a save is pending keeps it silent',
      args: profileFormOptions(),
      context: {
        areas: {
          authFlows: {
            auth: {
              status: 'authenticated',
              user: { id: 'u1', name: 'A', bio: 'B' },
              defer: ['updateProfile'],
            },
          },
        },
      },
      steps: [
        call('setValue', 'name', 'B'),
        call('submit'),
        { type: 'unmount' },
        control('authFlows.settleAuth', 'updateProfile', 'resolve'),
      ],
    },
  ],
}

/** `useVerifyPaymentReturn()`: post-checkout verification from the return page. */
export const useVerifyPaymentReturnCases: HookCases = {
  hook: 'useVerifyPaymentReturn',
  cases: [
    {
      name: 'idle on a page with no transaction',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
    },
    {
      name: 'reads the provider and id from the url',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: { areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } } },
    },
    {
      name: 'verifies once the session hydrates',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', defer: true }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
      steps: [
        {
          type: 'http',
          method: 'POST',
          url: '/users/u1/verify-payment/stripe',
          status: 200,
          data: { ok: true },
        },
      ],
    },
    {
      name: 'a failed verification reports and a retry succeeds',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 402,
            data: { error: 'insufficient' },
          },
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 200,
            data: { ok: true },
          },
        ],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
      steps: [call('retry')],
    },
    {
      name: 'the provider option names the fallback',
      args: [{ provider: 'paypal', onVerified: { $fn: 'onVerified' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/paypal', defer: true }],
        areas: { authFlows: { location: { search: '?token=t1' } } },
      },
      steps: [
        { type: 'http', method: 'POST', url: '/users/u1/verify-payment/paypal', status: 200 },
      ],
    },
    {
      name: 'enabled false skips verification',
      args: [{ enabled: false, onVerified: { $fn: 'onVerified' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
    },
    {
      name: 'cleanUrl false keeps the address',
      args: [{ cleanUrl: false, onVerified: { $fn: 'onVerified' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', status: 200 }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
    },
    {
      name: 'sessionId wins over token in the url',
      args: [{ onVerified: { $fn: 'onVerified' } }],
      context: {
        areas: { authFlows: { location: { search: '?token=t1&sessionId=s2&provider=stripe' } } },
      },
    },
    {
      // `session_id` (snake case), `subscriptionId` and `subscription_id` are
      // also transaction ids: each alone makes the page a checkout return —
      // one case per name, since the url is fixed at mount.
      name: 'session_id is a transaction id',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 200,
            data: { ok: true },
          },
        ],
        areas: { authFlows: { location: { search: '?session_id=s3&provider=stripe' } } },
      },
    },
    {
      name: 'subscriptionId is a transaction id',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 200,
            data: { ok: true },
          },
        ],
        areas: { authFlows: { location: { search: '?subscriptionId=sub1&provider=stripe' } } },
      },
    },
    {
      name: 'subscription_id is a transaction id',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 200,
            data: { ok: true },
          },
        ],
        areas: { authFlows: { location: { search: '?subscription_id=sub1&provider=stripe' } } },
      },
    },
    {
      name: 'the url provider wins over the option',
      args: [{ provider: 'paypal', onVerified: { $fn: 'onVerified' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [
          {
            method: 'POST',
            url: '/users/u1/verify-payment/stripe',
            status: 200,
            data: { ok: true },
          },
        ],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
    },
    {
      name: 'a network error fails the verification',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', networkError: 'offline' }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
    },
    {
      name: 'a failing refresh after a verified purchase still verifies',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        authErrors: { refresh: 'Session expired' },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', status: 200 }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
    },
    {
      name: 'waits while auth is still hydrating',
      args: [{ onVerified: { $fn: 'onVerified' } }],
      context: {
        auth: { status: 'loading' },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', defer: true }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        { type: 'http', method: 'POST', url: '/users/u1/verify-payment/stripe', status: 200 },
      ],
    },
    {
      // The purchase is paid for, so the profile is still refreshed; the
      // callbacks belong to the unmounted view, and the URL may be another
      // page's by now, so neither runs.
      name: 'a verification settling after unmount refreshes the profile only',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', defer: true }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
      steps: [
        { type: 'unmount' },
        { type: 'http', method: 'POST', url: '/users/u1/verify-payment/stripe', status: 200 },
      ],
    },
    {
      // Nothing is left to report a failure to, so it is logged (logger.warn).
      name: 'a verification failing after unmount is logged instead of reported',
      args: [{ onVerified: { $fn: 'onVerified' }, onError: { $fn: 'onError' } }],
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } },
        http: [{ method: 'POST', url: '/users/u1/verify-payment/stripe', defer: true }],
        areas: { authFlows: { location: { search: '?sessionId=s1&provider=stripe' } } },
      },
      steps: [
        { type: 'unmount' },
        { type: 'http', method: 'POST', url: '/users/u1/verify-payment/stripe', status: 402 },
      ],
    },
  ],
}
