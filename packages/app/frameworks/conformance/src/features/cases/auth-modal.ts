/**
 * `@molecule/app-auth-modal-react` cases: the in-app login / signup modal and
 * the mounted click-interceptor, over the services they read.
 *
 * Every case mounts through the binding kit's full composition
 * (`composition: 'app'`): the modal authenticates through the fake auth client
 * (`auth.login` / `auth.register` / `auth.refresh` are recorded calls), the
 * popup OAuth flow runs against the `authFlows` fakes (a scripted `window.open`
 * and the popup's relay message), and every label renders through the kit's
 * i18n provider.
 *
 * The interceptor's routing decisions themselves are the pure functions
 * (`authModeForHref` / `upgradePathForHref`, compared by value); the mounted
 * component renders nothing until a link is clicked, and a case cannot place an
 * anchor around it, so its cases hold the closed surface (nothing rendered, and
 * clicks / focus returns it ignores).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The OAuth config most open cases mount with (two providers, an api base URL). */
const oauthConfig = {
  baseURL: 'https://api.test',
  oauthProviders: ['github', 'google'],
}

/** The challenge node a captcha slot carries. */
const captchaNode = {
  tag: 'div',
  attrs: { 'data-parity-captcha': '' },
  children: ['challenge'],
}

/** `@molecule/app-auth-modal-react`. */
export const authModalFeature: FeatureCases = {
  package: '@molecule/app-auth-modal-react',
  composition: 'app',
  families: [
    {
      component: 'AuthModal',
      cases: [
        {
          name: 'signup defaults',
          props: { open: true, oauthConfig },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
        },
        {
          name: 'login mode',
          props: { open: true, oauthConfig, initialMode: 'login' },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
        },
        {
          name: 'closed renders nothing',
          props: { open: false, oauthConfig },
          callbacks: ['onClose'],
        },
        {
          name: 'opens and closes through the prop',
          props: { open: false, oauthConfig },
          callbacks: ['onClose'],
          interactions: [
            { type: 'props', props: { open: true } },
            { type: 'props', props: { open: false } },
          ],
        },
        {
          name: 'the switch button flips the mode',
          props: { open: true, oauthConfig },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: '[data-mol-id="auth-modal-switch"]' }],
        },
        {
          name: 'typed fields render their values',
          props: { open: true, oauthConfig, initialMode: 'login' },
          callbacks: ['onClose'],
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="auth-modal-email"]',
              value: 'ada@example.test',
            },
            { type: 'input', selector: '[data-mol-id="auth-modal-password"]', value: 'hunter2' },
            { type: 'input', selector: '[data-mol-id="auth-modal-2fa"]', value: '123456' },
          ],
        },
        {
          name: 'touch-first inputs size at 16px',
          props: { open: true, oauthConfig },
          callbacks: ['onClose'],
          pointer: 'coarse',
        },
        {
          name: 'an unsolved captcha gates the signup submit',
          props: { open: true, oauthConfig, captchaSolved: false },
          slots: { captchaSlot: [captchaNode] },
          callbacks: ['onClose'],
          interactions: [{ type: 'props', props: { captchaSolved: true } }],
        },
        {
          name: 'login never renders the captcha',
          props: { open: true, oauthConfig, initialMode: 'login', captchaSolved: false },
          slots: { captchaSlot: [captchaNode] },
          callbacks: ['onClose'],
        },
        {
          name: 'oauth providers render',
          props: { open: true, oauthConfig },
          callbacks: ['onClose'],
          interactions: [
            {
              type: 'props',
              props: { oauthConfig: { baseURL: 'https://api.test', oauthProviders: ['apple'] } },
            },
          ],
        },
        {
          name: 'a failed popup relay shows the oauth error',
          props: { open: true, oauthConfig },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          context: { areas: { authFlows: { popup: {} } } },
          interactions: [
            { type: 'click', selector: '[data-provider="github"]' },
            {
              type: 'control',
              name: 'authFlows.message',
              args: [{ ok: false, error: 'popup denied' }],
            },
          ],
        },
        {
          name: 'a solved popup relay signs in, confirms and closes',
          props: { open: true, oauthConfig },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          context: { areas: { authFlows: { popup: {} } } },
          fakeTimers: true,
          interactions: [
            { type: 'click', selector: '[data-provider="github"]' },
            {
              type: 'control',
              name: 'authFlows.message',
              args: [
                {
                  ok: true,
                  token: 'tok-1',
                  user: { name: 'Ada Lovelace', email: 'ada@example.test' },
                },
              ],
            },
            { type: 'advance', ms: 1000 },
          ],
        },
        {
          name: 'a pending login keeps the form busy',
          props: { open: true, oauthConfig, initialMode: 'login' },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          context: { areas: { authFlows: { auth: { defer: ['login'] } } } },
          fakeTimers: true,
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="auth-modal-email"]',
              value: 'ada@example.test',
            },
            { type: 'input', selector: '[data-mol-id="auth-modal-password"]', value: 'hunter2' },
            { type: 'submit', selector: 'form' },
            { type: 'control', name: 'authFlows.settleAuth', args: ['login', 'resolve'] },
            { type: 'advance', ms: 1000 },
          ],
        },
        {
          name: 'a successful login confirms and closes',
          props: { open: true, oauthConfig, initialMode: 'login' },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          fakeTimers: true,
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="auth-modal-email"]',
              value: 'ada@example.test',
            },
            { type: 'input', selector: '[data-mol-id="auth-modal-password"]', value: 'hunter2' },
            { type: 'submit', selector: 'form' },
            { type: 'advance', ms: 1000 },
          ],
        },
        {
          name: 'a successful signup confirms and closes',
          props: { open: true, oauthConfig },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          fakeTimers: true,
          interactions: [
            { type: 'input', selector: '[data-mol-id="auth-modal-name"]', value: 'Ada Lovelace' },
            {
              type: 'input',
              selector: '[data-mol-id="auth-modal-email"]',
              value: 'ada@example.test',
            },
            { type: 'input', selector: '[data-mol-id="auth-modal-password"]', value: 'hunter2' },
            { type: 'submit', selector: 'form' },
            { type: 'advance', ms: 1000 },
          ],
        },
        {
          name: 'a rejected login shows the error and stays',
          props: { open: true, oauthConfig, initialMode: 'login' },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          context: { authErrors: { login: 'Invalid credentials' } },
          interactions: [{ type: 'submit', selector: 'form' }],
        },
        {
          name: 'a rejected signup shows the error and stays',
          props: { open: true, oauthConfig },
          callbacks: ['onClose', 'onBeforeAuth', 'onAuthenticated'],
          context: { authErrors: { register: 'That email is taken' } },
          interactions: [{ type: 'submit', selector: 'form' }],
        },
      ],
    },
    {
      component: 'AuthModalMount',
      cases: [
        { name: 'closed renders nothing', props: { oauthConfig }, callbacks: ['onClose'] },
        {
          name: 'a click outside any anchor is left alone',
          props: { oauthConfig },
          callbacks: [
            'onClose',
            'onBeforeAuth',
            'onAuthenticated',
            'onUpgradeReturn',
            'onUpgradeIntercept',
          ],
          interactions: [{ type: 'click', selector: 'body' }],
        },
        {
          name: 'a focus return without an upgrade tab runs nothing',
          props: { oauthConfig },
          callbacks: ['onUpgradeReturn', 'onUpgradeIntercept'],
          interactions: [
            { type: 'windowFocus', focused: false },
            { type: 'windowFocus', focused: true },
          ],
        },
        {
          name: 'a remount keeps the interceptor quiet',
          props: { oauthConfig },
          callbacks: ['onUpgradeReturn', 'onUpgradeIntercept'],
          interactions: [{ type: 'remount' }, { type: 'click', selector: 'body' }],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_AUTH_PATHS' },
    { export: 'DEFAULT_UPGRADE_PATHS' },
    {
      export: 'authModeForHref',
      calls: [
        ['/login', 'https://app.example'],
        ['/signup', 'https://app.example'],
        ['https://app.example/login', 'https://app.example'],
        ['https://app.example/signup?from=cta', 'https://app.example'],
        ['/pricing', 'https://app.example'],
        ['/dashboard', 'https://app.example'],
        ['https://github.com/molecule-dev/molecule', 'https://app.example'],
        [null, 'https://app.example'],
        [undefined, 'https://app.example'],
        ['', 'https://app.example'],
        ['/enter', 'https://app.example', { '/enter': 'login' }],
        ['/login', 'https://app.example', { '/enter': 'login' }],
      ],
    },
    {
      export: 'upgradePathForHref',
      calls: [
        ['/pricing', 'https://app.example'],
        ['/billing', 'https://app.example'],
        ['https://app.example/pricing?plan=pro', 'https://app.example'],
        ['/login', 'https://app.example'],
        ['/', 'https://app.example'],
        [null, 'https://app.example'],
        ['/plans', 'https://app.example', ['/plans']],
        ['/pricing', 'https://app.example', ['/plans']],
      ],
    },
  ],
}
