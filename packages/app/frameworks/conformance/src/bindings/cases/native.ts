/**
 * Cases for the native hooks (useDevice, usePlatform, useCapacitorApp, usePush, useVersion).
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useDevice()`: the bonded device provider's info, features and helpers. */
export const useDeviceCases: HookCases = {
  hook: 'useDevice',
  cases: [
    { name: 'desktop defaults', context: { areas: { native: { device: {} } } } },
    {
      name: 'no bonded provider auto-creates the web default from the page',
      // The runner pins the page (desktop Linux browser, 1280×800, English,
      // online, no matching media query), so what the web provider reads is
      // the same in every binding package.
      steps: [
        { type: 'call', method: 'supports', args: ['geolocation'] },
        { type: 'call', method: 'isOnline' },
        { type: 'call', method: 'isStandalone' },
      ],
    },
    {
      name: 'a mobile touch device with a granted feature',
      context: {
        areas: {
          native: {
            device: {
              deviceInfo: {
                name: 'Pixel 8 · Conformance',
                isMobile: true,
                isTablet: false,
                isDesktop: false,
                type: 'mobile',
                hasTouch: true,
                browser: { name: 'Conformance Mobile', version: '2.0.0', majorVersion: 2 },
                os: { name: 'Android', version: '15', family: 'Android' },
              },
              screenInfo: { width: 412, height: 915, orientation: 'portrait', pixelRatio: 2.625 },
              hardwareInfo: { maxTouchPoints: 5, memory: 8 },
              featureSupport: { webShare: true, vibration: true },
              language: 'fr-FR',
              languages: ['fr-FR', 'en-US'],
              isOnline: true,
            },
          },
        },
      },
    },
    {
      name: 'supports() answers per feature',
      context: {
        areas: { native: { device: { featureSupport: { geolocation: true, bluetooth: true } } } },
      },
      steps: [
        { type: 'call', method: 'supports', args: ['geolocation'] },
        { type: 'call', method: 'supports', args: ['nfc'] },
        { type: 'call', method: 'supports', args: ['bluetooth'] },
      ],
    },
    {
      name: 'isOnline and isStandalone read the provider',
      context: { areas: { native: { device: { isOnline: false, isStandalone: true } } } },
      steps: [
        { type: 'call', method: 'isOnline' },
        { type: 'call', method: 'isStandalone' },
      ],
    },
    {
      name: 'empty language and no preferred languages',
      context: {
        areas: {
          native: {
            device: {
              language: '',
              languages: [],
              deviceInfo: { userAgent: '', vendor: undefined },
            },
          },
        },
      },
      steps: [
        { type: 'call', method: 'isOnline' },
        { type: 'call', method: 'isStandalone' },
      ],
    },
  ],
}

/** `usePlatform()`: detected platform info plus the `isPlatform` helper. */
export const usePlatformCases: HookCases = {
  hook: 'usePlatform',
  cases: [
    {
      name: 'no seed detects the pinned page as web',
      // No Capacitor or Electron global, the pinned desktop user agent,
      // NODE_ENV 'test' and no npm_package_version.
      steps: [{ type: 'call', method: 'isPlatform', args: ['web'] }],
    },
    {
      name: 'web by default',
      context: {
        areas: {
          native: {
            // NODE_ENV is vitest's 'test': neither development nor production.
            platform: { appVersion: '1.2.3' },
          },
        },
      },
    },
    {
      name: 'capacitor ios is native and mobile',
      context: { areas: { native: { platform: { capacitor: 'ios' } } } },
    },
    {
      name: 'capacitor android is native and mobile',
      context: { areas: { native: { platform: { capacitor: 'android' } } } },
    },
    {
      name: 'electron on linux is a native desktop',
      context: {
        areas: {
          native: {
            platform: {
              electron: true,
              userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Electron/30.0',
            },
          },
        },
      },
    },
    {
      name: 'a react-native iphone user agent maps to ios',
      context: {
        areas: {
          native: {
            platform: {
              reactNative: true,
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Conformance',
            },
          },
        },
      },
    },
    {
      name: 'production environment flags and app version',
      context: { areas: { native: { platform: { nodeEnv: 'production', appVersion: '9.9.9' } } } },
    },
    {
      name: 'development environment flags',
      context: { areas: { native: { platform: { nodeEnv: 'development', appVersion: '0.0.1' } } } },
    },
    {
      name: 'isPlatform answers for the current platform',
      context: { areas: { native: { platform: {} } } },
      steps: [
        { type: 'call', method: 'isPlatform', args: ['web'] },
        { type: 'call', method: 'isPlatform', args: ['ios', 'android'] },
        { type: 'call', method: 'isPlatform', args: [] },
      ],
    },
    {
      name: 'isPlatform matches a capacitor ios device',
      context: { areas: { native: { platform: { capacitor: 'ios' } } } },
      steps: [
        { type: 'call', method: 'isPlatform', args: ['ios', 'android'] },
        { type: 'call', method: 'isPlatform', args: ['web'] },
      ],
    },
  ],
}

/** `useCapacitorApp(options)`: the native app startup coordinator's state. */
export const useCapacitorAppCases: HookCases = {
  hook: 'useCapacitorApp',
  cases: [
    {
      name: 'default options become ready on mount',
      args: [{}],
    },
    {
      name: 'calls onReady once initialized',
      args: [{ onReady: { $fn: 'ready' } }],
      context: { areas: { native: { capacitor: {} } } },
    },
    {
      name: 'push notifications register during init and ready follows',
      args: [{ pushNotifications: true, onReady: { $fn: 'ready' } }],
      context: { areas: { native: { capacitor: {} } } },
    },
    {
      name: 'a failed push registration warns and still readies',
      args: [{ pushNotifications: true }],
      context: { areas: { native: { capacitor: { pushError: 'Push unavailable' } } } },
    },
    {
      name: 'a pending push registration delays readiness until it settles',
      args: [{ pushNotifications: true }],
      context: { areas: { native: { capacitor: {}, push: { deferRegister: true } } } },
      steps: [{ type: 'control', name: 'native.push.settleRegister', args: [true] }],
    },
    {
      name: 'deep links deliver the launch url to onDeepLink',
      args: [{ deepLinks: true, onDeepLink: { $fn: 'deepLink' } }],
      context: { areas: { native: { capacitor: { launchUrl: 'https://app.local/deep/path' } } } },
    },
    {
      name: 'a failed launch-info lookup warns but stays ready',
      args: [{ deepLinks: true, onDeepLink: { $fn: 'deepLink' } }],
      context: { areas: { native: { capacitor: { launchError: 'no launcher' } } } },
    },
    {
      name: 'deepLinks without onDeepLink initializes nothing extra',
      args: [{ deepLinks: true }],
      context: { areas: { native: { capacitor: {} } } },
    },
    {
      name: 'runs the native device-ready path when Capacitor is present',
      args: [{}],
      context: { areas: { native: { platform: { capacitor: 'ios' }, capacitor: {} } } },
    },
    {
      name: 'initialize can be run again and re-registers push',
      args: [{ pushNotifications: true }],
      context: { areas: { native: { capacitor: {} } } },
      steps: [{ type: 'call', method: 'initialize' }],
    },
    {
      name: 'unmount while push init is pending settles quietly',
      args: [{ pushNotifications: true }],
      context: { areas: { native: { capacitor: {}, push: { deferRegister: true } } } },
      steps: [
        { type: 'unmount' },
        { type: 'control', name: 'native.push.settleRegister', args: [true] },
      ],
    },
    {
      name: 'unmount destroys the deep-link subscription',
      args: [{ deepLinks: true, onDeepLink: { $fn: 'deepLink' } }],
      context: { areas: { native: { capacitor: { launchUrl: 'https://app.local/x' } } } },
      steps: [{ type: 'unmount' }],
    },
  ],
}

/** `usePush(options)`: push notification state and actions off the bonded provider. */
export const usePushCases: HookCases = {
  hook: 'usePush',
  cases: [
    {
      name: 'starts with no permission and no token',
      context: { areas: { native: { push: {} } } },
    },
    {
      name: 'no bonded provider auto-creates the web default instead of throwing',
      // `getProvider()` bonds `createWebPushProvider()` on first render; the
      // mount path calls no provider method, so the result is the same null
      // state as a seeded provider at rest.
    },
    {
      name: 'checkOnMount reads the permission',
      args: [{ checkOnMount: true }],
      context: { areas: { native: { push: { permission: 'granted' } } } },
    },
    {
      name: 'a failing checkOnMount leaves permission unset and warns once',
      // usePush.ts:76-80 — the mount check's failure is reported through the
      // bonded logger; the fakes record it as `logger.warn`, so the observable
      // contract is "no permission, exactly one warning".
      args: [{ checkOnMount: true }],
      context: { areas: { native: { push: { checkError: 'permission API blocked' } } } },
    },
    {
      name: 'a pending checkOnMount shows no permission until it settles',
      args: [{ checkOnMount: true }],
      context: { areas: { native: { push: { deferPermission: true } } } },
      steps: [{ type: 'control', name: 'native.push.settlePermission', args: [true, 'granted'] }],
    },
    {
      name: 'turning checkOnMount on through args checks once more',
      // Outcome-independent of React keeping hook state across the args change:
      // a fresh mount with checkOnMount:true also performs exactly one check.
      context: { areas: { native: { push: { permission: 'denied' } } } },
      steps: [{ type: 'args', args: [{ checkOnMount: true }] }],
    },
    {
      name: 'checkPermission resolves and stores the status',
      context: { areas: { native: { push: { permission: 'granted' } } } },
      steps: [{ type: 'call', method: 'checkPermission' }],
    },
    {
      name: 'requestPermission grants and stores the status',
      context: { areas: { native: { push: { permission: 'default', requestResult: 'granted' } } } },
      steps: [{ type: 'call', method: 'requestPermission' }],
    },
    {
      name: 'a failed requestPermission rejects and keeps the previous status',
      context: {
        areas: { native: { push: { permission: 'denied', requestError: 'user dismissed' } } },
      },
      steps: [{ type: 'call', method: 'requestPermission' }],
    },
    {
      name: 'register stores the token',
      context: { areas: { native: { push: {} } } },
      steps: [{ type: 'call', method: 'register' }],
    },
    {
      name: 'register forwards a vapid public key',
      context: { areas: { native: { push: { token: { value: 'tok-web', platform: 'web' } } } } },
      steps: [{ type: 'call', method: 'register', args: [{ vapidPublicKey: 'BP-public-key' }] }],
    },
    {
      name: 'a failed register rejects and leaves no token',
      context: { areas: { native: { push: { registerError: 'no service worker' } } } },
      steps: [{ type: 'call', method: 'register' }],
    },
    {
      name: 'unregister clears a registered token',
      context: { areas: { native: { push: {} } } },
      steps: [
        { type: 'call', method: 'register' },
        { type: 'call', method: 'unregister' },
      ],
    },
    {
      name: 'listeners receive notifications, actions and token changes',
      // The returned unsubscribe functions are never called, so the provider
      // still holds all three listeners after unmount — that is the contract.
      context: { areas: { native: { push: {} } } },
      steps: [
        { type: 'call', method: 'onNotificationReceived', args: [{ $fn: 'received' }] },
        { type: 'call', method: 'onNotificationAction', args: [{ $fn: 'acted' }] },
        { type: 'call', method: 'onTokenChange', args: [{ $fn: 'tokenChanged' }] },
        { type: 'control', name: 'native.push.receive', args: [true] },
        { type: 'control', name: 'native.push.action', args: ['open'] },
        { type: 'control', name: 'native.push.token', args: ['push-token-9'] },
      ],
    },
    {
      name: 'a background notification reports foreground false',
      context: { areas: { native: { push: {} } } },
      steps: [
        { type: 'call', method: 'onNotificationReceived', args: [{ $fn: 'received' }] },
        { type: 'control', name: 'native.push.receive', args: [false] },
      ],
    },
    {
      name: 'a notification arriving with no listener recorded is dropped',
      context: { areas: { native: { push: {} } } },
      steps: [{ type: 'control', name: 'native.push.receive', args: [true] }],
    },
    {
      name: 'setBadge and clearBadge call through',
      context: { areas: { native: { push: {} } } },
      steps: [
        { type: 'call', method: 'setBadge', args: [3] },
        { type: 'call', method: 'clearBadge' },
        { type: 'call', method: 'setBadge', args: [0] },
      ],
    },
    {
      name: 'unmount while register is pending settles without a warning',
      context: { areas: { native: { push: { deferRegister: true } } } },
      steps: [
        { type: 'call', method: 'register' },
        { type: 'unmount' },
        { type: 'control', name: 'native.push.settleRegister', args: [true] },
      ],
    },
    {
      name: 'a settled-as-failed register rejects after unmount',
      context: { areas: { native: { push: { deferRegister: true } } } },
      steps: [
        { type: 'call', method: 'register' },
        { type: 'unmount' },
        { type: 'control', name: 'native.push.settleRegister', args: [false] },
      ],
    },
  ],
}

/** `useVersion()`: version state, update checks and the update actions. */
export const useVersionCases: HookCases = {
  hook: 'useVersion',
  cases: [
    {
      name: 'idle state by default',
      context: { areas: { native: { version: {} } } },
    },
    {
      name: 'no bonded provider auto-creates the empty web state',
      // The web default starts from fixed constants (empty build id and
      // version, every flag false) — nothing reads the test environment.
    },
    {
      name: 'a seeded lastChecked round-trips',
      context: {
        areas: { native: { version: { state: { lastChecked: '2026-01-02T03:04:05.000Z' } } } },
      },
    },
    {
      name: 'a check that finds nothing clears isChecking',
      context: { areas: { native: { version: { checkResult: false } } } },
      steps: [{ type: 'call', method: 'checkForUpdates' }],
    },
    {
      name: 'a check that finds an update sets newVersion',
      context: { areas: { native: { version: { checkResult: true } } } },
      steps: [{ type: 'call', method: 'checkForUpdates' }],
    },
    {
      name: 'a pending check shows isChecking until it settles',
      context: { areas: { native: { version: { checkPending: true } } } },
      steps: [
        { type: 'call', method: 'checkForUpdates' },
        { type: 'control', name: 'native.version.settleCheck', args: [true] },
      ],
    },
    {
      name: 'a failed check rejects and clears isChecking',
      context: { areas: { native: { version: { checkError: 'version endpoint down' } } } },
      steps: [{ type: 'call', method: 'checkForUpdates' }],
    },
    {
      name: 'dismissUpdate hides an update a check found',
      context: { areas: { native: { version: { checkResult: true } } } },
      steps: [
        { type: 'call', method: 'checkForUpdates' },
        { type: 'call', method: 'dismissUpdate' },
      ],
    },
    {
      name: 'an update arriving from outside updates the state',
      context: { areas: { native: { version: {} } } },
      steps: [{ type: 'control', name: 'native.version.updateAvailable' }],
    },
    {
      name: 'a waiting service worker shows in the state',
      context: { areas: { native: { version: {} } } },
      steps: [
        { type: 'control', name: 'native.version.serviceWorkerWaiting', args: [true] },
        { type: 'control', name: 'native.version.serviceWorkerWaiting', args: [false] },
      ],
    },
    {
      name: 'applyUpdate forwards options and defaults',
      context: { areas: { native: { version: {} } } },
      steps: [
        { type: 'call', method: 'applyUpdate' },
        { type: 'call', method: 'applyUpdate', args: [{ force: true }] },
      ],
    },
    {
      name: 'periodic checks run on the interval and stop',
      fakeTimers: true,
      context: { areas: { native: { version: { checkResult: false } } } },
      steps: [
        { type: 'call', method: 'startPeriodicChecks', args: [{ interval: 1000 }] },
        { type: 'advance', ms: 1000 },
        { type: 'advance', ms: 3000 },
        { type: 'call', method: 'stopPeriodicChecks' },
        { type: 'advance', ms: 2000 },
      ],
    },
    {
      name: 'immediate periodic checks check right away',
      fakeTimers: true,
      context: { areas: { native: { version: { checkResult: false } } } },
      steps: [
        {
          type: 'call',
          method: 'startPeriodicChecks',
          args: [{ immediate: true, interval: 5000 }],
        },
        { type: 'advance', ms: 5000 },
      ],
    },
    {
      name: 'unmount while a check is pending settles without warnings',
      context: { areas: { native: { version: { checkPending: true } } } },
      steps: [
        { type: 'call', method: 'checkForUpdates' },
        { type: 'unmount' },
        { type: 'control', name: 'native.version.settleCheck', args: [false] },
      ],
    },
    {
      name: 'periodic checks keep running after unmount',
      // useVersion never stops periodic checks on unmount — the provider-owned
      // interval keeps polling. That behavior is pinned here, not judged.
      fakeTimers: true,
      context: { areas: { native: { version: { checkResult: false } } } },
      steps: [
        { type: 'call', method: 'startPeriodicChecks', args: [{ interval: 1000 }] },
        { type: 'unmount' },
        { type: 'advance', ms: 1000 },
      ],
    },
  ],
}
