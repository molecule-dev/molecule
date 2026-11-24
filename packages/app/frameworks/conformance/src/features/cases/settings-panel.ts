/**
 * `@molecule/app-settings-panel-react` cases: the settings container and its
 * sections — account fields over the shared profile form, the theme switch,
 * password + two-factor enrollment, web-push enable/disable, plan display and
 * the Stripe tier flow, the device list, the current-device strip, and the
 * sign-out / delete-account pair.
 *
 * Every case mounts through the binding kit's full composition
 * (`composition: 'app'`): sections read auth, HTTP, theme, device and push,
 * so each case's context seeds the fake services (`http` scripts, `authErrors`,
 * `areas.native.device`, `areas.native.push`) and every request a section
 * makes is recorded like a callback call.
 *
 * `<LogOutDeleteSection>` reads `onClose` from the container's context and
 * throws outside it, so its states are exercised as a child of
 * `SettingsContainer` (the kit's compound-component pattern; there is no
 * `mountInside` case language yet). The other sections read no container
 * context, so their families mount them directly.
 *
 * The current-device push helpers (`findCurrentDevice`, …) are exercised
 * through the `NotificationsSection` UI; they live framework-free in
 * `@molecule/app-push`, so `shared` declares them and each framework's
 * settings panel must re-export the same functions.
 *
 * @module
 */

import type { BindingContext, HttpScript } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** The signed-in user the auth fake serves; its `id` names the wire URLs. */
const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.test' }

/** The authenticated context the signed-in sections run with. */
const authed: BindingContext = { auth: { status: 'authenticated', user } }

/** Device rows `GET /api/devices` answers, with a flagged current device. */
const deviceRows = (hasPushSubscription: boolean): HttpScript[] => [
  {
    method: 'GET',
    url: '/api/devices',
    data: [
      { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true, hasPushSubscription },
      { id: 'd2', name: 'Laptop', platform: 'linux' },
    ],
  },
]

/** A web push token whose value is the serialized subscription the fake registers. */
const webToken = {
  value: '{"endpoint":"https://push.example.test/send/1","keys":{"p256dh":"k1","auth":"a1"}}',
  platform: 'web',
} as const

/** A free plan with one paid tier, as `TiersUpgradeSection` loads them, then the checkout answer. */
const freeWithProTier = (checkout: Omit<HttpScript, 'method' | 'url'>): HttpScript[] => [
  {
    method: 'GET',
    url: '/api/billing/status',
    data: { name: 'Free', planKey: 'free', isFree: true },
  },
  {
    method: 'GET',
    url: '/api/billing/tiers',
    data: {
      data: [
        {
          key: 'pro',
          name: 'Pro',
          prices: [{ stripePriceId: 'price_pro_m', period: 'month', price: '$9' }],
        },
      ],
    },
  },
  { method: 'POST', url: '/api/billing/checkout', ...checkout },
]

/** Opens the upgrade modal and subscribes to the only price. */
const subscribe: FeatureCases['families'][number]['cases'][number]['interactions'] = [
  { type: 'click', selector: 'section button' },
  { type: 'click', selector: '[role="dialog"] li button' },
]

/** The `/api/users/me` answer `AuthSection` reads its two-factor status from. */
const twoFactorStatus = (enabled: boolean): HttpScript[] => [
  { method: 'GET', url: '/api/users/me', data: { props: { twoFactorEnabled: enabled } } },
]

/** `SettingsContainer`: layout, the recorded `onClose`, and what it publishes. */
const container: FeatureCases['families'][number] = {
  component: 'SettingsContainer',
  cases: [
    {
      name: 'hosts a section under its padding and stack',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: authed,
    },
    {
      name: 'log out closes the panel and returns to /login',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: authed,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu-logout"]' }],
    },
    {
      name: 'probe closes the panel through the container context',
      callbacks: ['onClose'],
      children: [{ probe: 'useSettingsPanelContext', method: 'onClose', label: 'close panel' }],
      interactions: [{ type: 'click', selector: '[data-parity-probe="close panel"]' }],
    },
    {
      name: 'delete account submits the password and closes the panel',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: {
        ...authed,
        http: [{ method: 'DELETE', url: '/api/users/u1', status: 200, data: { ok: true } }],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu-delete-account"]' },
        { type: 'input', selector: '#delete-pw', value: 'correct-horse' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'a rejected delete shows the error and keeps the modal',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: {
        ...authed,
        http: [{ method: 'DELETE', url: '/api/users/u1', status: 500, data: {} }],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu-delete-account"]' },
        { type: 'input', selector: '#delete-pw', value: 'wrong-horse' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'a refused delete shows the server message, not the status line',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: {
        ...authed,
        http: [
          {
            method: 'DELETE',
            url: '/api/users/u1',
            status: 403,
            data: { error: 'Incorrect password.' },
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu-delete-account"]' },
        { type: 'input', selector: '#delete-pw', value: 'wrong-horse' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'delete modal closes on Escape',
      callbacks: ['onClose'],
      children: [{ component: 'LogOutDeleteSection' }],
      context: authed,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu-delete-account"]' },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
      ],
    },
    {
      name: 'several sections compose under one container',
      callbacks: ['onClose'],
      children: [{ component: 'AppearanceSection' }, { component: 'ThisDeviceSection' }],
      context: { ...authed, areas: { native: { device: {} } } },
    },
  ],
}

/** `AccountSection`: profile fields over the auth client's profile transport. */
const account: FeatureCases['families'][number] = {
  component: 'AccountSection',
  cases: [
    {
      name: 'signed-in profile fills the fields',
      context: authed,
    },
    {
      name: 'edited name saves on blur',
      context: authed,
      interactions: [
        { type: 'focus', selector: '#settings-name' },
        { type: 'input', selector: '#settings-name', value: 'Ada Edited' },
        { type: 'blur', selector: '#settings-name' },
      ],
    },
    {
      name: 'edited email saves on blur',
      context: authed,
      interactions: [
        { type: 'focus', selector: '#settings-email' },
        { type: 'input', selector: '#settings-email', value: 'ada@new.example.test' },
        { type: 'blur', selector: '#settings-email' },
      ],
    },
    {
      name: 'malformed email shows a field error and saves nothing',
      context: authed,
      interactions: [
        { type: 'focus', selector: '#settings-email' },
        { type: 'input', selector: '#settings-email', value: 'not-an-email' },
        { type: 'blur', selector: '#settings-email' },
      ],
    },
    {
      name: 'a rejected save keeps the edits and shows the error',
      context: { ...authed, authErrors: { updateProfile: 'Save rejected' } },
      interactions: [
        { type: 'focus', selector: '#settings-name' },
        { type: 'input', selector: '#settings-name', value: 'Ada Edited' },
        { type: 'blur', selector: '#settings-name' },
      ],
    },
    {
      name: 'clearing the email saves only the name',
      context: authed,
      interactions: [
        { type: 'focus', selector: '#settings-email' },
        { type: 'input', selector: '#settings-email', value: '' },
        { type: 'focus', selector: '#settings-name' },
        { type: 'input', selector: '#settings-name', value: 'Ada Renamed' },
        { type: 'blur', selector: '#settings-name' },
      ],
    },
    {
      name: 'signed out renders empty fields',
      context: { auth: { status: 'unauthenticated' } },
    },
    {
      name: 'another account signing in elsewhere refills the fields',
      context: authed,
      interactions: [
        {
          type: 'auth',
          status: 'authenticated',
          user: { id: 'u2', name: 'Grace Hopper', email: 'grace@example.test' },
        },
      ],
    },
    {
      name: 'signing out elsewhere empties the fields',
      context: authed,
      interactions: [{ type: 'auth', status: 'unauthenticated' }],
    },
    {
      name: 'submitting the form saves',
      context: authed,
      interactions: [
        { type: 'input', selector: '#settings-name', value: 'Ada Submitted' },
        { type: 'submit', selector: 'section form' },
      ],
    },
  ],
}

/** `AppearanceSection`: the dark-mode switch over the theme bond. */
const appearance: FeatureCases['families'][number] = {
  component: 'AppearanceSection',
  cases: [
    { name: 'light mode with an unchecked switch', context: { theme: 'light' } },
    {
      name: 'toggling switches to dark',
      context: { theme: 'light' },
      interactions: [{ type: 'click', selector: '#settings-theme-toggle' }],
    },
    { name: 'dark mode with a checked switch', context: { theme: 'dark' } },
    {
      name: 'toggling again switches back to light',
      context: { theme: 'dark' },
      interactions: [{ type: 'click', selector: '#settings-theme-toggle' }],
    },
  ],
}

/** `AuthSection`: change-password modal and the two-factor enrollment flow. */
const auth: FeatureCases['families'][number] = {
  component: 'AuthSection',
  cases: [
    {
      name: 'two-factor off offers enable',
      context: { ...authed, http: twoFactorStatus(false) },
    },
    {
      name: 'two-factor on shows the state and offers disable',
      context: { ...authed, http: twoFactorStatus(true) },
    },
    {
      name: 'an unreachable status read keeps two-factor off',
      context: authed,
    },
    {
      name: 'oauth-only user hides the section',
      context: {
        auth: { status: 'authenticated', user: { ...user, oauthServer: 'github' } },
        http: twoFactorStatus(false),
      },
    },
    {
      name: 'change password modal opens, submits and closes',
      context: { ...authed, http: twoFactorStatus(false) },
      interactions: [
        { type: 'click', selector: 'section > div > button' },
        { type: 'input', selector: '#current-pw', value: 'old-password' },
        { type: 'input', selector: '#new-pw', value: 'new-password-9' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'a rejected change password shows the alert',
      context: {
        ...authed,
        authErrors: { changePassword: 'Current password is wrong' },
        http: twoFactorStatus(false),
      },
      interactions: [
        { type: 'click', selector: 'section > div > button' },
        { type: 'input', selector: '#current-pw', value: 'old-password' },
        { type: 'input', selector: '#new-pw', value: 'new-password-9' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'change password modal closes on Escape',
      context: { ...authed, http: twoFactorStatus(false) },
      interactions: [
        { type: 'click', selector: 'section > div > button' },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
      ],
    },
    {
      name: 'enrollment shows the QR and verifying the code enables it',
      context: {
        ...authed,
        http: [
          ...twoFactorStatus(false),
          {
            method: 'POST',
            url: '/api/users/u1/verify-two-factor',
            data: {
              QRImageUrl: 'https://qr.example.test/seed.png',
              keyUrl: 'https://otp.example.test/u1',
              secret: 'JBSWY3DPEHPK3PXP',
            },
          },
          { method: 'POST', url: '/api/users/u1/verify-two-factor', data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="two-factor-enable"]' },
        { type: 'input', selector: '#tf-token', value: '123456' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'an unavailable enrollment endpoint shows the message',
      context: {
        ...authed,
        http: [
          ...twoFactorStatus(false),
          { method: 'POST', url: '/api/users/u1/verify-two-factor', status: 500, data: {} },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="two-factor-enable"]' }],
    },
    {
      name: 'disable confirms the current code and turns it off',
      context: {
        ...authed,
        http: [
          ...twoFactorStatus(true),
          { method: 'POST', url: '/api/users/u1/verify-two-factor', data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="two-factor-disable"]' },
        { type: 'input', selector: '#tf-token', value: '654321' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'a refused code shows the server message, not the status line',
      context: {
        ...authed,
        http: [
          ...twoFactorStatus(true),
          {
            method: 'POST',
            url: '/api/users/u1/verify-two-factor',
            status: 400,
            data: { error: 'That code has expired.' },
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="two-factor-disable"]' },
        { type: 'input', selector: '#tf-token', value: '000000' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
    {
      name: 'a rejected disable code shows the error',
      context: {
        ...authed,
        http: [
          ...twoFactorStatus(true),
          { method: 'POST', url: '/api/users/u1/verify-two-factor', status: 400, data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="two-factor-disable"]' },
        { type: 'input', selector: '#tf-token', value: '000000' },
        { type: 'submit', selector: '[role="dialog"] form' },
      ],
    },
  ],
}

/** `NotificationsSection`: the web-push enable/disable chain per device row. */
const notifications: FeatureCases['families'][number] = {
  component: 'NotificationsSection',
  cases: [
    {
      name: 'off when the current device has no subscription',
      context: {
        ...authed,
        http: deviceRows(false),
        areas: { native: { push: { token: webToken } } },
      },
    },
    {
      name: 'on when the current device has a subscription',
      context: {
        ...authed,
        http: deviceRows(true),
        areas: { native: { push: { token: webToken } } },
      },
    },
    {
      name: 'an unreachable devices endpoint renders off',
      context: { ...authed, areas: { native: { push: { token: webToken } } } },
    },
    {
      name: 'enabling registers and persists on the current device',
      context: {
        ...authed,
        http: [
          ...deviceRows(false),
          {
            method: 'GET',
            url: '/api/devices/push/public-key',
            data: { publicKey: 'vapid-key-1' },
          },
          ...deviceRows(false),
          { method: 'PATCH', url: '/api/devices/d1', data: {} },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'denied permission reports it and stays off',
      context: {
        ...authed,
        http: deviceRows(false),
        areas: { native: { push: { token: webToken, requestResult: 'denied' } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'an unconfigured push server reports it and stays off',
      context: {
        ...authed,
        http: [
          ...deviceRows(false),
          { method: 'GET', url: '/api/devices/push/public-key', status: 404, data: {} },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'a failing registration reports its message',
      context: {
        ...authed,
        http: [
          ...deviceRows(false),
          {
            method: 'GET',
            url: '/api/devices/push/public-key',
            data: { publicKey: 'vapid-key-1' },
          },
        ],
        areas: {
          native: { push: { token: webToken, registerError: 'No service worker registered' } },
        },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'a failing persist reports it and stays off',
      context: {
        ...authed,
        http: [
          ...deviceRows(false),
          {
            method: 'GET',
            url: '/api/devices/push/public-key',
            data: { publicKey: 'vapid-key-1' },
          },
          ...deviceRows(false),
          { method: 'PATCH', url: '/api/devices/d1', status: 500, data: {} },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'no device row reports a failed persist',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [{ id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true }],
          },
          {
            method: 'GET',
            url: '/api/devices/push/public-key',
            data: { publicKey: 'vapid-key-1' },
          },
          { method: 'GET', url: '/api/devices', data: [] },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'disabling unregisters and clears the device row',
      context: {
        ...authed,
        http: [
          ...deviceRows(true),
          ...deviceRows(true),
          { method: 'PATCH', url: '/api/devices/d1', data: {} },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'disabling survives a failing unsubscribe',
      context: {
        ...authed,
        http: [
          ...deviceRows(true),
          ...deviceRows(true),
          { method: 'PATCH', url: '/api/devices/d1', data: {} },
        ],
        areas: {
          native: { push: { token: webToken, unregisterError: 'No active subscription' } },
        },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
    {
      name: 'disabling reports when the server clear fails',
      context: {
        ...authed,
        http: [
          ...deviceRows(true),
          ...deviceRows(true),
          { method: 'PATCH', url: '/api/devices/d1', status: 500, data: {} },
        ],
        areas: { native: { push: { token: webToken } } },
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="settings-push-toggle"]' }],
    },
  ],
}

/**
 * `BillingSection`: the plan label and the Upgrade navigation. `upgradeTo` is required: the
 * `/settings` default it once had sent Upgrade back to the page the section sits in, so 93
 * flagship panels had an Upgrade button that went nowhere.
 */
const billing: FeatureCases['families'][number] = {
  component: 'BillingSection',
  cases: [
    {
      name: 'with no page to open it offers no Upgrade',
      context: authed,
    },
    {
      name: 'an unreachable status read falls back to the plan prop',
      props: { plan: 'Starter', upgradeTo: '/pricing' },
      context: authed,
    },
    {
      name: 'the loaded plan name wins over the default',
      props: { upgradeTo: '/pricing' },
      context: {
        ...authed,
        http: [{ method: 'GET', url: '/api/billing/status', data: { name: 'Pro' } }],
      },
    },
    {
      name: 'upgrade navigates to the upgradeTo route',
      props: { upgradeTo: '/pricing' },
      context: { ...authed, route: '/settings' },
      interactions: [{ type: 'click', selector: 'section button' }],
    },
  ],
}

/** `TiersUpgradeSection`: the multi-tier upgrade modal and cancel flow. */
const tiersUpgrade: FeatureCases['families'][number] = {
  component: 'TiersUpgradeSection',
  cases: [
    {
      name: 'free plan loads tiers and opens the upgrade modal',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                { key: 'free', name: 'Free', prices: [] },
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [
                    { stripePriceId: 'price_pro_m', period: 'month', price: '$9' },
                    { stripePriceId: null, period: 'year', price: '$90' },
                  ],
                },
                {
                  key: 'team',
                  name: 'Team',
                  prices: [{ stripePriceId: 'price_team_y', period: 'year', price: '$99' }],
                },
              ],
            },
          },
        ],
      },
      interactions: [{ type: 'click', selector: 'section button' }],
    },
    {
      // A paid tier whose price has no id (its price env var unset, or no provider that can
      // check out) has nothing to buy, so there is no Upgrade button to lead nowhere.
      name: 'nothing for sale offers no upgrade',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                { key: 'free', name: 'Free', prices: [] },
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [{ stripePriceId: null, period: 'month', price: '$9' }],
                },
              ],
            },
          },
        ],
      },
    },
    {
      name: 'failed loads show no plan and no upgrade',
      context: authed,
    },
    {
      name: 'subscribe starts checkout with the price id',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [{ stripePriceId: 'price_pro_m', period: 'month', price: '$9' }],
                },
              ],
            },
          },
          { method: 'POST', url: '/api/billing/checkout', data: { updated: true } },
        ],
      },
      interactions: [
        { type: 'click', selector: 'section button' },
        { type: 'click', selector: '[role="dialog"] li button' },
      ],
    },
    {
      name: 'subscribe without a checkout url or update reports failure',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [{ stripePriceId: 'price_pro_m', period: 'month', price: '$9' }],
                },
              ],
            },
          },
          { method: 'POST', url: '/api/billing/checkout', data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: 'section button' },
        { type: 'click', selector: '[role="dialog"] li button' },
      ],
    },
    {
      name: 'a rejected checkout shows the message',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [{ stripePriceId: 'price_pro_m', period: 'month', price: '$9' }],
                },
              ],
            },
          },
          { method: 'POST', url: '/api/billing/checkout', status: 500, data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: 'section button' },
        { type: 'click', selector: '[role="dialog"] li button' },
      ],
    },
    {
      name: 'a refused checkout shows the server message, not the status line',
      context: {
        ...authed,
        http: freeWithProTier({ status: 502, data: { error: 'Checkout is unavailable.' } }),
      },
      interactions: subscribe,
    },
    {
      name: 'a checkout url leaves through redirectToCheckout',
      callbacks: ['redirectToCheckout'],
      context: {
        ...authed,
        http: freeWithProTier({ data: { checkoutUrl: 'https://checkout.example.test/s/1' } }),
      },
      interactions: subscribe,
    },
    {
      // The server decides what the plan is after a cancel (a provider may cancel at period end).
      name: 'confirming cancel reloads the plan the server reports',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Pro', planKey: 'pro', isFree: false },
          },
          {
            method: 'GET',
            url: '/api/billing/tiers',
            data: {
              data: [
                {
                  key: 'pro',
                  name: 'Pro',
                  prices: [{ stripePriceId: 'price_pro_m', period: 'month', price: '$9' }],
                },
              ],
            },
          },
          { method: 'POST', url: '/api/billing/cancel', data: {} },
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Free', planKey: 'free', isFree: true },
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="billing-cancel-subscription"]' },
        { type: 'click', selector: '[data-mol-id="billing-cancel-subscription"]' },
      ],
    },
    {
      name: 'cancel disarms on Escape',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Pro', planKey: 'pro', isFree: false },
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="billing-cancel-subscription"]' },
        { type: 'keydown', selector: '[data-mol-id="billing-cancel-subscription"]', key: 'Escape' },
      ],
    },
    {
      name: 'a rejected cancel shows the message and keeps the plan',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { name: 'Pro', planKey: 'pro', isFree: false },
          },
          { method: 'POST', url: '/api/billing/cancel', status: 500, data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="billing-cancel-subscription"]' },
        { type: 'click', selector: '[data-mol-id="billing-cancel-subscription"]' },
      ],
    },
  ],
}

/** `DevicesSection`: the device list and its revoke flow. */
const devices: FeatureCases['families'][number] = {
  component: 'DevicesSection',
  cases: [
    {
      name: 'lists devices and marks the current one',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux', lastSeen: 'yesterday' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
        ],
      },
    },
    {
      name: 'a device without a name shows its platform',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [{ id: 'd3', name: '', platform: 'android', isCurrent: true }],
          },
        ],
      },
    },
    {
      name: 'no devices shows the empty message',
      context: { ...authed, http: [{ method: 'GET', url: '/api/devices', data: [] }] },
    },
    {
      name: 'a pending list shows loading until it answers',
      context: { ...authed, http: [{ method: 'GET', url: '/api/devices', defer: true }] },
      interactions: [
        {
          type: 'http',
          method: 'GET',
          url: '/api/devices',
          data: [{ id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true }],
        },
      ],
    },
    {
      name: 'an unreachable devices endpoint renders empty',
      context: authed,
    },
    {
      name: 'revoking asks to confirm',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="device-revoke"]' }],
    },
    {
      name: 'cancel keeps the device',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="device-revoke"]' },
        { type: 'click', selector: 'section li button:first-of-type' },
      ],
    },
    {
      name: 'confirming signs the device out and reloads',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
          { method: 'DELETE', url: '/api/devices/d2', status: 200, data: {} },
          {
            method: 'GET',
            url: '/api/devices',
            data: [{ id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true }],
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="device-revoke"]' },
        { type: 'click', selector: '[data-mol-id="device-revoke-confirm"]' },
      ],
    },
    {
      name: 'a failed revoke keeps the row for a retry',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
          { method: 'DELETE', url: '/api/devices/d2', status: 500, data: {} },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="device-revoke"]' },
        { type: 'click', selector: '[data-mol-id="device-revoke-confirm"]' },
      ],
    },
    {
      name: 'a custom row renderer replaces the revoke control',
      props: {
        renderRowIcon: {
          $fn: 'rowIcon',
          nodes: [
            { tag: 'span', attrs: { 'data-row': '{0.id}' }, children: ['row action for {0.name}'] },
          ],
        },
      },
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/devices',
            data: [
              { id: 'd2', name: 'Laptop', platform: 'linux' },
              { id: 'd1', name: 'Phone', platform: 'ios', isCurrent: true },
            ],
          },
        ],
      },
    },
  ],
}

/** `ThisDeviceSection`: the current device's platform, browser and network. */
const thisDevice: FeatureCases['families'][number] = {
  component: 'ThisDeviceSection',
  cases: [
    {
      name: 'platform, browser and online network',
      context: {
        ...authed,
        areas: {
          native: {
            device: {
              deviceInfo: {
                os: { name: 'Fedora Linux', version: '42', family: 'Linux' },
                browser: { name: 'Sable', version: '2.0', majorVersion: 2 },
              },
            },
          },
        },
      },
    },
    {
      name: 'offline network',
      context: {
        ...authed,
        areas: {
          native: {
            device: {
              isOnline: false,
              deviceInfo: {
                os: { name: 'Fedora Linux', version: '42', family: 'Linux' },
                browser: { name: 'Sable', version: '2.0', majorVersion: 2 },
              },
            },
          },
        },
      },
    },
    {
      name: 'unknown platform and browser fall back',
      context: {
        ...authed,
        areas: {
          native: {
            device: {
              deviceInfo: {
                os: { name: '', version: '', family: '' },
                browser: { name: '', version: '', majorVersion: 0 },
              },
            },
          },
        },
      },
    },
  ],
}

/**
 * `LogOutDeleteSection` reads `onClose` from the container's context and
 * throws outside it, so it has no standalone cases: every branch — sign out,
 * the delete-account modal (open, type, submit, Escape, failure), the
 * navigation to `/login` and the recorded `onClose` — is exercised as a child
 * of `SettingsContainer` above.
 */
const logOutDelete: FeatureCases['families'][number] = {
  component: 'LogOutDeleteSection',
  cases: [],
}

/** `@molecule/app-settings-panel-react`. */
export const settingsPanelFeature: FeatureCases = {
  package: '@molecule/app-settings-panel-react',
  composition: 'app',
  families: [
    container,
    account,
    appearance,
    auth,
    notifications,
    billing,
    tiersUpgrade,
    devices,
    thisDevice,
    logOutDelete,
  ],
  shared: {
    disablePushOnCurrentDevice: '@molecule/app-push',
    enablePushOnCurrentDevice: '@molecule/app-push',
    findCurrentDevice: '@molecule/app-push',
    readCurrentDevicePushEnabled: '@molecule/app-push',
    subscriptionFromToken: '@molecule/app-push',
  },
  frameworkShaped: {
    SettingsPanelContext:
      'a React context object: each framework publishes the container context its own way; useSettingsPanelContext is the contract',
  },
}
