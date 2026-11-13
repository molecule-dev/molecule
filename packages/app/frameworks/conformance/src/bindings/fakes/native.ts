/**
 * Binding-case fakes for one area: device, platform, push, version and
 * Capacitor providers for the native hooks, plus the workspace, editor and
 * preview services for the IDE hooks.
 *
 * A case seeds this area through `context.areas.native`; `control` steps call
 * the controls registered here (named `native.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * The factory is a NO-OP unless the case seeds `context.areas.native` — every
 * binding case in the kit runs every area's factory, and bonding a global (or
 * stubbing `navigator`) for a case that did not ask for it would change another
 * area's recorded calls.
 *
 * Every fake is deterministic: no `Date.now()`, no `Math.random()` — token
 * timestamps, new-version strings and event ids are fixed constants, so
 * React's recorded result is stable across runs.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import type {
  DiffFile,
  EditorChangeEvent,
  EditorConfig,
  EditorFile,
  EditorPosition,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import type {
  DeviceInfo,
  DeviceProvider,
  FeatureSupport,
  HardwareInfo,
  ScreenInfo,
} from '@molecule/app-device'
import { setProvider as setDeviceProvider } from '@molecule/app-device'
import type {
  PanelConfig,
  PanelId,
  WorkspaceLayout,
  WorkspaceProvider,
  WorkspaceState,
} from '@molecule/app-ide'
import type {
  AppStateChange,
  BatteryState,
  LaunchInfo,
  LifecycleProvider,
  NetworkState,
} from '@molecule/app-lifecycle'
import { setProvider as setLifecycleProvider } from '@molecule/app-lifecycle'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { resetPlatformCache } from '@molecule/app-platform'
import type {
  NotificationActionEvent,
  NotificationReceivedEvent,
  PermissionStatus,
  PushNotification,
  PushProvider,
  PushRegisterOptions,
  PushToken,
} from '@molecule/app-push'
import { setProvider as setPushProvider } from '@molecule/app-push'
import type {
  UpdateCheckOptions,
  VersionEvent,
  VersionProvider,
  VersionState,
} from '@molecule/app-version'
import { DEFAULT_CHECK_INTERVAL, setProvider as setVersionProvider } from '@molecule/app-version'

import { CONFORMANCE_USER_AGENT, patchEnv, patchProperty } from '../environment.js'
import type { AreaFakes, AreaFakesFactory } from '../spec.js'

/**
 * What a case can seed for this area (`context.areas.native`). Each key turns
 * on that fake: `device`, `push` and `version` bond a recording fake provider
 * for the case (restored in `dispose`), `platform` stubs the globals platform
 * detection reads, `capacitor` bonds the push/lifecycle/logger fakes
 * `useCapacitorApp` reaches through, and `workspace`/`editor`/`preview`
 * provide those services to the framework's providers (a case that omits one
 * runs without that service in context).
 */
export interface NativeSeed {
  /** Recording device provider for `useDevice` (bonded for the case). */
  device?: DeviceSeed
  /** Platform-detection globals for `usePlatform` and `useCapacitorApp` (stubbed and restored). */
  platform?: PlatformSeed
  /** Recording push provider for `usePush` and `useCapacitorApp`'s push init (bonded for the case). */
  push?: PushSeed
  /** Recording version provider for `useVersion` (bonded for the case). */
  version?: VersionSeed
  /** Enables the Capacitor coordinator path: bonds push, lifecycle and a recording logger. */
  capacitor?: CapacitorSeed
  /** IDE workspace service for `useWorkspace`/`useWorkspaceProvider`. */
  workspace?: WorkspaceSeed
  /** Code editor service for `useEditor`/`useEditorProvider`. */
  editor?: EditorSeed
  /** Live preview service for `usePreview`/`usePreviewProvider`. */
  preview?: PreviewSeed
}

/** Values the fake device provider returns; every field has a fixed default. */
export interface DeviceSeed {
  /** Parsed device identity (merged over the desktop default). */
  deviceInfo?: Partial<DeviceInfo>
  /** Screen dimensions and mode (merged over a 1440×900@2x default). */
  screenInfo?: Partial<ScreenInfo>
  /** Hardware capabilities (merged over 8-core/16GB defaults). */
  hardwareInfo?: Partial<HardwareInfo>
  /** Feature flags (merged over all-false defaults). */
  featureSupport?: Partial<FeatureSupport>
  /** `getLanguage()` (default `'en-US'`). */
  language?: string
  /** `getLanguages()` (default `['en-US', 'fr']`). */
  languages?: string[]
  /** `isOnline()` (default `true`). */
  isOnline?: boolean
  /** `isStandalone()` (default `false`). */
  isStandalone?: boolean
}

/** Globals the platform detection reads; each is stubbed for the case and restored after. */
export interface PlatformSeed {
  /** Define `window.Capacitor` with `getPlatform()`/`isNativePlatform()` (omit for no Capacitor global). */
  capacitor?: 'ios' | 'android'
  /** Define `window.electron` (Electron desktop detection). */
  electron?: boolean
  /** `navigator.userAgent` (default a fixed conformance string). */
  userAgent?: string
  /** Set `navigator.product` to `'ReactNative'` (React Native detection). */
  reactNative?: boolean
  /** Pin `process.env.NODE_ENV` (drives `isDevelopment`/`isProduction`; restored after). */
  nodeEnv?: string
  /** Pin `process.env.npm_package_version` (drives `PlatformInfo.appVersion`; restored after). */
  appVersion?: string
}

/** Behavior of the fake push provider. */
export interface PushSeed {
  /** `checkPermission()` resolves this (default `'default'`). */
  permission?: PermissionStatus
  /** `requestPermission()` resolves this (default `'granted'`). */
  requestResult?: PermissionStatus
  /** `checkPermission()` rejects with this message instead. */
  checkError?: string
  /** `requestPermission()` rejects with this message instead. */
  requestError?: string
  /** `register()` rejects with this message instead. */
  registerError?: string
  /** `unregister()` rejects with this message instead. */
  unregisterError?: string
  /** The token `register()` resolves — `value`/`platform` only; the timestamp is a fixed constant. */
  token?: { value: string; platform: 'web' | 'ios' | 'android' }
  /** `checkPermission()`/`requestPermission()` stay pending until `native.push.settlePermission` answers. */
  deferPermission?: boolean
  /** `register()`/`unregister()` stay pending until `native.push.settleRegister` answers. */
  deferRegister?: boolean
}

/** Behavior of the fake version provider. */
export interface VersionSeed {
  /**
   * State to start from (defaults: `buildId: 'b1'`, `version: '1.0.0'`, all
   * flags false). `lastChecked` is seeded as an ISO string (a case is plain
   * JSON and cannot carry a `Date`).
   */
  state?: Partial<Omit<VersionState, 'lastChecked'>> & { lastChecked?: string }
  /** `checkForUpdates()` resolves with this (default `false` = no update). */
  checkResult?: boolean
  /** `checkForUpdates()` rejects with this message instead. */
  checkError?: string
  /** `checkForUpdates()` stays pending until the `native.version.settleCheck` control answers it. */
  checkPending?: boolean
}

/** What the Capacitor coordinator's push/lifecycle dependencies do. */
export interface CapacitorSeed {
  /** Push registration (`pushNotifications: true`) rejects with this message; the app still becomes ready. */
  pushError?: string
  /** The launch URL `getLaunchInfo()` reports (delivered to the `onDeepLink` option). */
  launchUrl?: string
  /** `getLaunchInfo()` rejects with this message (deep-link init warns). */
  launchError?: string
}

/** State the fake workspace service starts from. */
export interface WorkspaceSeed {
  /** Panels of the default layout (default: chat left, editor center, preview right). */
  panels?: PanelConfig[]
  /** The provider's active panel at mount (default `null`). */
  activePanel?: PanelId | null
  /** The provider's collapsed panels at mount (default none). */
  collapsedPanels?: PanelId[]
  /** The provider's fullscreen flag at mount (default `false`). */
  isFullscreen?: boolean
  /**
   * Expose `getState()` on the service (default omitted): `useWorkspace` reads
   * the full state through it instead of fabricating the non-layout fields from
   * `getLayout()`. Covers the `WorkspaceProvider.getState?` branch of the
   * interface with a referentially stable snapshot, as `useSyncExternalStore`
   * requires.
   */
  fullState?: boolean
}

/** State the fake editor service starts from. */
export interface EditorSeed {
  /** Tabs open at mount (default none). */
  tabs?: EditorTab[]
  /** Stored content of the seeded tabs (default `''`). */
  content?: string
}

/** State the fake preview service starts from. */
export interface PreviewSeed {
  /** The preview's load target (default `'http://preview.local/start'`). */
  url?: string
  /** Device frame (default `'none'`). */
  device?: DeviceFrame
  /** Loading flag at mount (default `false`). */
  isLoading?: boolean
  /** Error at mount (default `null`). */
  error?: string | null
  /** Connection flag at mount (default `true`). */
  isConnected?: boolean
}

/** Fixed timestamp used for every fake `PushToken` (a real clock would be nondeterministic). */
const FIXED_TOKEN_TIMESTAMP = 1_700_000_000_000

/** The version an available update reports (fixed, so snapshots are stable). */
const UPDATE_VERSION = '2.0.0'
/** The build id an available update reports. */
const UPDATE_BUILD_ID = 'b2'

/** The fixed base URL the fake preview resolves relative paths against. */
const PREVIEW_BASE = 'http://preview.local'

/** What a mutable fake exposes to `control` steps, next to its provider. */
interface Driven<T> {
  /** The provider/service a hook uses. */
  provider: T
  /** Outside actions on the fake (NOT recorded — they are not hook calls). */
  driver: Record<string, (...args: unknown[]) => void>
}

/**
 * Saves a set of bond slots and returns a function restoring each to its
 * previous provider — or to "no provider" (`bond(type, null)`) when it had
 * none, so an auto-created default keeps being auto-created after the case.
 * Call BEFORE bonding the fake.
 *
 * @param types - The bond category strings ('device', 'push', …).
 * @returns The restore function for `dispose`.
 */
function saveBonds(types: readonly string[]): () => void {
  const saved = types.map((type) => ({
    type,
    had: isBonded(type),
    provider: bondGet<unknown>(type),
  }))
  return () => {
    for (const { type, had, provider } of saved) bond(type, had ? provider : null)
  }
}

/**
 * Builds the recording device provider. All values come from the seed (with
 * fixed defaults), so nothing reads the real `navigator`/`screen`.
 *
 * @param seed - The case's device seed.
 * @param record - Receives every call (`device.getDeviceInfo`, …).
 * @returns The provider.
 */
function createDeviceFake(
  seed: DeviceSeed,
  record: (name: string, args: unknown[]) => void,
): DeviceProvider {
  const defaultBrowser = {
    name: 'Conformance',
    version: '1.0.0',
    majorVersion: 1,
    engine: 'ConformanceEngine',
    engineVersion: '1',
  }
  const defaultOs = { name: 'Linux', version: '6.0', family: 'Linux' }
  const deviceInfo: DeviceInfo = {
    ...{
      name: 'Linux Desktop · Conformance',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      type: 'desktop',
      vendor: 'Molecule',
      model: 'Conformance Box',
      hasTouch: false,
      userAgent: CONFORMANCE_USER_AGENT,
    },
    ...seed.deviceInfo,
    browser: { ...defaultBrowser, ...seed.deviceInfo?.browser },
    os: { ...defaultOs, ...seed.deviceInfo?.os },
  }
  const screenInfo: ScreenInfo = {
    ...{
      width: 1440,
      height: 900,
      availableWidth: 1440,
      availableHeight: 870,
      pixelRatio: 2,
      colorDepth: 24,
      orientation: 'landscape',
      isDarkMode: false,
    },
    ...seed.screenInfo,
  }
  const hardwareInfo: HardwareInfo = {
    ...{
      cpuCores: 8,
      memory: 16,
      maxTouchPoints: 0,
      hasWebGL: true,
      webGLRenderer: 'Conformance GL',
    },
    ...seed.hardwareInfo,
  }
  const features = seed.featureSupport
  const featureSupport: FeatureSupport = {
    serviceWorker: features?.serviceWorker ?? false,
    pushNotifications: features?.pushNotifications ?? false,
    webShare: features?.webShare ?? false,
    geolocation: features?.geolocation ?? false,
    mediaDevices: features?.mediaDevices ?? false,
    bluetooth: features?.bluetooth ?? false,
    nfc: features?.nfc ?? false,
    vibration: features?.vibration ?? false,
    webUSB: features?.webUSB ?? false,
    webSerial: features?.webSerial ?? false,
    webAuthn: features?.webAuthn ?? false,
    indexedDB: features?.indexedDB ?? false,
    localStorage: features?.localStorage ?? false,
    webSocket: features?.webSocket ?? false,
    fullscreen: features?.fullscreen ?? false,
    pictureInPicture: features?.pictureInPicture ?? false,
    crypto: features?.crypto ?? false,
    clipboard: features?.clipboard ?? false,
  }
  const language = seed.language ?? 'en-US'
  const languages = seed.languages ?? ['en-US', 'fr']
  return {
    getDeviceInfo: () => {
      record('device.getDeviceInfo', [])
      return deviceInfo
    },
    getScreenInfo: () => {
      record('device.getScreenInfo', [])
      return screenInfo
    },
    getHardwareInfo: () => {
      record('device.getHardwareInfo', [])
      return hardwareInfo
    },
    getFeatureSupport: () => {
      record('device.getFeatureSupport', [])
      return featureSupport
    },
    supports: (feature) => {
      record('device.supports', [feature])
      return featureSupport[feature]
    },
    getUserAgent: () => {
      record('device.getUserAgent', [])
      return deviceInfo.userAgent
    },
    getPlatform: () => {
      record('device.getPlatform', [])
      return 'Conformance64'
    },
    getLanguage: () => {
      record('device.getLanguage', [])
      return language
    },
    getLanguages: () => {
      record('device.getLanguages', [])
      return [...languages]
    },
    isOnline: () => {
      record('device.isOnline', [])
      return seed.isOnline ?? true
    },
    isStandalone: () => {
      record('device.isStandalone', [])
      return seed.isStandalone ?? false
    },
  }
}

/**
 * Stubs the globals platform detection reads (`window.Capacitor`,
 * `window.electron`, `navigator.userAgent`, `navigator.product`,
 * `NODE_ENV`, `npm_package_version`) and resets the module-level platform
 * cache (in both directions, so one case's cached `PlatformInfo` never leaks).
 *
 * @param seed - The case's platform seed.
 * @returns The restore function.
 */
function stubPlatformGlobals(seed: PlatformSeed): () => void {
  const restore: (() => void)[] = []
  const asWindow = window as unknown as Record<string, unknown>
  if (seed.capacitor) {
    restore.push(
      patchProperty(asWindow, 'Capacitor', {
        getPlatform: () => seed.capacitor,
        isNativePlatform: () => true,
      }),
    )
  }
  if (seed.electron) restore.push(patchProperty(asWindow, 'electron', { bridge: true }))
  restore.push(patchProperty(navigator, 'userAgent', seed.userAgent ?? CONFORMANCE_USER_AGENT))
  if (seed.reactNative) restore.push(patchProperty(navigator, 'product', 'ReactNative'))
  if (seed.nodeEnv !== undefined) restore.push(patchEnv('NODE_ENV', seed.nodeEnv))
  if (seed.appVersion !== undefined) restore.push(patchEnv('npm_package_version', seed.appVersion))
  resetPlatformCache()
  return () => {
    for (const undo of restore.reverse()) undo()
    resetPlatformCache()
  }
}

/**
 * Builds the recording push provider plus the drivers that fire notification,
 * action and token events and change the permission from outside.
 *
 * @param seed - The case's push seed.
 * @param record - Receives every call (`push.checkPermission`, …).
 * @param listeners - Filled with the provider's live listener counts.
 * @returns The provider and its outside drivers.
 */
function createPushFake(
  seed: PushSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): Driven<PushProvider> {
  let permission: PermissionStatus = seed.permission ?? 'default'
  const requestResult: PermissionStatus = seed.requestResult ?? 'granted'
  const token: PushToken = {
    value: seed.token?.value ?? 'push-token-1',
    platform: seed.token?.platform ?? 'web',
    timestamp: FIXED_TOKEN_TIMESTAMP,
  }
  let notificationCount = 0
  const received = new Set<(event: NotificationReceivedEvent) => void>()
  const actions = new Set<(event: NotificationActionEvent) => void>()
  const tokenListeners = new Set<(t: PushToken) => void>()
  const syncCounts = (): void => {
    listeners['native.push.received'] = received.size
    listeners['native.push.actions'] = actions.size
    listeners['native.push.tokens'] = tokenListeners.size
  }
  const makeNotification = (): PushNotification => {
    notificationCount++
    return { id: `n${notificationCount}`, title: 'Build finished', body: 'Deployed to production' }
  }
  const fail = (message: string | undefined): void => {
    if (message) throw new Error(message)
  }
  interface Deferred {
    kind: 'permission' | 'register' | 'unregister'
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
  const deferred: Deferred[] = []
  const defer = (kind: Deferred['kind']): Promise<unknown> =>
    new Promise((resolve, reject) => {
      deferred.push({ kind, resolve, reject })
    })
  const provider: PushProvider = {
    checkPermission: async () => {
      record('push.checkPermission', [])
      fail(seed.checkError)
      if (seed.deferPermission) return defer('permission') as Promise<PermissionStatus>
      return permission
    },
    requestPermission: async () => {
      record('push.requestPermission', [])
      fail(seed.requestError)
      if (seed.deferPermission) return defer('permission') as Promise<PermissionStatus>
      permission = requestResult
      return permission
    },
    register: async (options?: PushRegisterOptions) => {
      record('push.register', [options])
      fail(seed.registerError)
      if (seed.deferRegister) return defer('register') as Promise<PushToken>
      tokenListeners.forEach((listener) => listener(token))
      return token
    },
    unregister: async () => {
      record('push.unregister', [])
      fail(seed.unregisterError)
      if (seed.deferRegister) return defer('unregister') as Promise<void>
    },
    getToken: async () => {
      record('push.getToken', [])
      return token
    },
    onNotificationReceived: (listener) => {
      record('push.onNotificationReceived', [])
      received.add(listener)
      syncCounts()
      return () => {
        received.delete(listener)
        syncCounts()
      }
    },
    onNotificationAction: (listener) => {
      record('push.onNotificationAction', [])
      actions.add(listener)
      syncCounts()
      return () => {
        actions.delete(listener)
        syncCounts()
      }
    },
    onTokenChange: (listener) => {
      record('push.onTokenChange', [])
      tokenListeners.add(listener)
      syncCounts()
      return () => {
        tokenListeners.delete(listener)
        syncCounts()
      }
    },
    scheduleLocal: async (options) => {
      record('push.scheduleLocal', [options])
      return options.id ?? `local-${options.title}`
    },
    cancelLocal: async (id) => {
      record('push.cancelLocal', [id])
    },
    cancelAllLocal: async () => {
      record('push.cancelAllLocal', [])
    },
    getPendingLocal: async () => {
      record('push.getPendingLocal', [])
      return []
    },
    getDelivered: async () => {
      record('push.getDelivered', [])
      return []
    },
    removeDelivered: async (ids) => {
      record('push.removeDelivered', [ids])
    },
    removeAllDelivered: async () => {
      record('push.removeAllDelivered', [])
    },
    setBadge: async (count) => {
      record('push.setBadge', [count])
    },
    getBadge: async () => {
      record('push.getBadge', [])
      return 0
    },
    clearBadge: async () => {
      record('push.clearBadge', [])
    },
    destroy: () => {
      record('push.destroy', [])
      received.clear()
      actions.clear()
      tokenListeners.clear()
      syncCounts()
    },
  }
  const driver = {
    /** Fires a notification-received event at the registered listeners. */
    receive: (foreground: unknown): void => {
      const event: NotificationReceivedEvent = {
        notification: makeNotification(),
        foreground: foreground === true,
      }
      for (const listener of [...received]) listener(event)
    },
    /** Fires a notification-action event at the registered listeners. */
    action: (actionId: unknown): void => {
      const event: NotificationActionEvent = {
        notification: makeNotification(),
        ...(actionId === undefined ? {} : { actionId: String(actionId) }),
      }
      for (const listener of [...actions]) listener(event)
    },
    /** Fires a token-change event at the registered listeners. */
    token: (value: unknown): void => {
      const next: PushToken = {
        value: String(value ?? 'push-token-2'),
        platform: 'web',
        timestamp: FIXED_TOKEN_TIMESTAMP,
      }
      for (const listener of [...tokenListeners]) listener(next)
    },
    /** Changes what `checkPermission()` answers, without touching records. */
    setPermission: (status: unknown): void => {
      permission = (status ?? 'granted') as PermissionStatus
    },
    /**
     * Answers the oldest pending permission call: resolves it with the given
     * status (default: `'granted'`), or rejects it with a fixed message.
     */
    settlePermission: (ok: unknown, status: unknown): void => {
      const next = deferred.findIndex((entry) => entry.kind === 'permission')
      if (next < 0) return
      const [entry] = deferred.splice(next, 1)
      if (ok === false) entry.reject(new Error('Permission deferred by the OS'))
      else {
        permission = (status ?? permission) as PermissionStatus
        entry.resolve(permission)
      }
    },
    /**
     * Answers the oldest pending register/unregister call: resolves it (with
     * the token for a register), or rejects it with a fixed message.
     */
    settleRegister: (ok: unknown): void => {
      const next = deferred.findIndex(
        (entry) => entry.kind === 'register' || entry.kind === 'unregister',
      )
      if (next < 0) return
      const [entry] = deferred.splice(next, 1)
      if (ok === false) entry.reject(new Error('Registration deferred by the OS'))
      else {
        if (entry.kind === 'register') {
          tokenListeners.forEach((listener) => listener(token))
          entry.resolve(token)
        } else entry.resolve(undefined)
      }
    },
  }
  return { provider, driver }
}

/**
 * Builds the recording version provider: a state machine whose checks emit the
 * events `useVersion` subscribes to. `applyUpdate` records instead of
 * reloading the page. A pending check settles through the driver.
 *
 * @param seed - The case's version seed.
 * @param record - Receives every call (`version.checkForUpdates`, …).
 * @param listeners - Filled with the provider's live handler count.
 * @returns The provider and its outside drivers.
 */
function createVersionFake(
  seed: VersionSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): Driven<VersionProvider> & { stopPeriodicChecks: () => void } {
  // A case is plain JSON: its `lastChecked` is an ISO string, not a `Date`, so
  // it is lifted out of the seed spread and converted in a typed branch.
  const { lastChecked: seededLastChecked, ...seededState } = seed.state ?? {}
  let state: VersionState = {
    ...{
      buildId: 'b1',
      version: '1.0.0',
      isUpdateAvailable: false,
      isServiceWorkerWaiting: false,
      isChecking: false,
    },
    ...seededState,
    ...(seededLastChecked === undefined ? {} : { lastChecked: new Date(seededLastChecked) }),
  }
  const handlers = new Map<VersionEvent, Set<(data: unknown) => void>>()
  const syncCount = (): void => {
    let total = 0
    for (const set of handlers.values()) total += set.size
    listeners['native.version'] = total
  }
  const emit = (event: VersionEvent, data: unknown): void => {
    for (const handler of [...(handlers.get(event) ?? [])]) handler(data)
  }
  const updateState = (partial: Partial<VersionState>): void => {
    state = { ...state, ...partial }
  }
  const finishCheck = (available: boolean): void => {
    updateState({
      isChecking: false,
      ...(available
        ? { isUpdateAvailable: true, newVersion: UPDATE_VERSION, newBuildId: UPDATE_BUILD_ID }
        : { isUpdateAvailable: false }),
    })
    emit('check-complete', { available })
    if (available) emit('update-available', { version: UPDATE_VERSION, buildId: UPDATE_BUILD_ID })
  }
  let pendingResolve: ((available: boolean) => void) | null = null
  const runCheck = (): Promise<boolean> => {
    record('version.checkForUpdates', [])
    updateState({ isChecking: true })
    emit('check-start', undefined)
    if (seed.checkError) {
      updateState({ isChecking: false })
      emit('check-error', { message: seed.checkError })
      return Promise.reject(new Error(seed.checkError))
    }
    if (seed.checkPending) {
      return new Promise<boolean>((resolve) => {
        pendingResolve = resolve
      })
    }
    const available = seed.checkResult ?? false
    finishCheck(available)
    return Promise.resolve(available)
  }
  let interval: ReturnType<typeof setInterval> | null = null
  const stopInterval = (): void => {
    if (interval) clearInterval(interval)
    interval = null
  }
  const provider: VersionProvider = {
    getState: () => {
      record('version.getState', [])
      return { ...state }
    },
    setCurrentVersion: (info) => {
      record('version.setCurrentVersion', [info])
      updateState({ buildId: info.buildId, version: info.version })
    },
    checkForUpdates: () => runCheck(),
    startPeriodicChecks: (options?: UpdateCheckOptions) => {
      record('version.startPeriodicChecks', [options])
      stopInterval()
      // A failed poll is not surfaced to the page, like the web provider's
      // polling: runCheck has already emitted 'check-error' and recorded the
      // call, and the next tick polls again.
      const poll = (): void => {
        void runCheck().catch((_error: unknown) => {
          // Reported through the 'check-error' event above; nothing to add here.
        })
      }
      if (options?.immediate) poll()
      interval = setInterval(poll, options?.interval ?? DEFAULT_CHECK_INTERVAL)
    },
    stopPeriodicChecks: () => {
      record('version.stopPeriodicChecks', [])
      stopInterval()
    },
    getServiceWorker: () => ({
      register: async () => null,
      unregister: async () => true,
      update: async () => undefined,
      skipWaiting: () => {
        record('version.skipWaiting', [])
      },
      getRegistration: () => null,
      getWaiting: () => null,
      isWaiting: () => false,
      postMessage: () => undefined,
    }),
    applyUpdate: (options) => {
      // The real provider reloads the page; a fake must not.
      record('version.applyUpdate', [options])
    },
    dismissUpdate: () => {
      record('version.dismissUpdate', [])
      updateState({ isUpdateAvailable: false })
    },
    on: (event, handler) => {
      record('version.on', [event])
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler as (data: unknown) => void)
      syncCount()
      return () => {
        handlers.get(event)?.delete(handler as (data: unknown) => void)
        syncCount()
      }
    },
    off: (event, handler) => {
      record('version.off', [event])
      handlers.get(event)?.delete(handler as (data: unknown) => void)
      syncCount()
    },
    destroy: () => {
      record('version.destroy', [])
      stopInterval()
      handlers.clear()
      syncCount()
    },
  }
  const driver = {
    /** Finishes a pending check with the given outcome. */
    settleCheck: (available: unknown): void => {
      const result = available === true
      finishCheck(result)
      const resolve = pendingResolve
      pendingResolve = null
      resolve?.(result)
    },
    /** Marks an update available and emits `update-available` (as the server would). */
    updateAvailable: (): void => {
      updateState({
        isUpdateAvailable: true,
        newVersion: UPDATE_VERSION,
        newBuildId: UPDATE_BUILD_ID,
      })
      emit('update-available', { version: UPDATE_VERSION, buildId: UPDATE_BUILD_ID })
    },
    /** Flips the waiting-service-worker flag and emits `service-worker-waiting`. */
    serviceWorkerWaiting: (waiting: unknown): void => {
      updateState({ isServiceWorkerWaiting: waiting === true })
      emit('service-worker-waiting', undefined)
    },
  }
  return { provider, driver, stopPeriodicChecks: stopInterval }
}

/**
 * Builds the recording lifecycle provider — only `onUrlOpen` and
 * `getLaunchInfo` are observable, through `useCapacitorApp`'s deep-link init.
 *
 * @param seed - The case's Capacitor seed.
 * @param record - Receives every call (`lifecycle.onUrlOpen`, …).
 * @param listeners - Filled with the provider's live url-open listener count.
 * @returns The provider.
 */
function createLifecycleFake(
  seed: CapacitorSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): LifecycleProvider {
  const urlOpen = new Set<(url: string) => void>()
  const networkState: NetworkState = { connected: true, connectionType: 'wifi', isExpensive: false }
  const battery: BatteryState = { level: 1, charging: true, chargingTime: 0, dischargingTime: 0 }
  const launchInfo: LaunchInfo = seed.launchUrl
    ? { coldStart: true, url: seed.launchUrl }
    : { coldStart: false }
  return {
    getAppState: () => 'active',
    getNetworkState: async () => networkState,
    getBatteryState: async () => battery,
    getLaunchInfo: async () => {
      record('lifecycle.getLaunchInfo', [])
      if (seed.launchError) throw new Error(seed.launchError)
      return launchInfo
    },
    onAppStateChange: (listener: (change: AppStateChange) => void) => {
      record('lifecycle.onAppStateChange', [])
      return () => {
        void listener
      }
    },
    onNetworkChange: () => () => undefined,
    onBatteryChange: () => () => undefined,
    onTerminate: () => () => undefined,
    onUrlOpen: (listener) => {
      record('lifecycle.onUrlOpen', [])
      urlOpen.add(listener)
      listeners['native.lifecycle.urlOpen'] = urlOpen.size
      return () => {
        urlOpen.delete(listener)
        listeners['native.lifecycle.urlOpen'] = urlOpen.size
      }
    },
    onMemoryWarning: () => () => undefined,
    destroy: () => {
      urlOpen.clear()
      listeners['native.lifecycle.urlOpen'] = urlOpen.size
    },
  }
}

/**
 * The fake workspace provider's default panels (chat left, editor center,
 * preview right).
 */
const DEFAULT_PANELS: PanelConfig[] = [
  {
    id: 'chat',
    position: 'left',
    defaultSize: 300,
    resizable: true,
    collapsible: true,
    visible: true,
  },
  {
    id: 'editor',
    position: 'center',
    defaultSize: 600,
    resizable: true,
    collapsible: false,
    visible: true,
  },
  {
    id: 'preview',
    position: 'right',
    defaultSize: 400,
    resizable: true,
    collapsible: true,
    visible: true,
  },
]

/** Builds a layout from a panel list (sizes take each panel's `defaultSize`, in order). */
const layoutOf = (panels: PanelConfig[]): WorkspaceLayout => {
  const sizes: WorkspaceLayout['sizes'] = { left: [], center: [], right: [], bottom: [] }
  for (const panel of panels) sizes[panel.position].push(panel.defaultSize ?? 0)
  return { panels: panels.map((panel) => ({ ...panel })), sizes }
}

/**
 * Builds the recording workspace service. Mutating methods apply simple
 * documented semantics (toggle flips `visible`, resize rewrites the panel's
 * size in its position) and notify subscribers with the full state.
 *
 * @param seed - The case's workspace seed.
 * @param record - Receives every call (`workspace.togglePanel`, …).
 * @param listeners - Filled with the provider's live subscriber count.
 * @returns The provider and its outside drivers.
 */
function createWorkspaceFake(
  seed: WorkspaceSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): Driven<WorkspaceProvider> {
  const defaultLayout = layoutOf(seed.panels ?? DEFAULT_PANELS)
  const subscribers = new Set<(state: WorkspaceState) => void>()
  let layout = defaultLayout
  let activePanel = seed.activePanel ?? null
  let collapsedPanels = new Set(seed.collapsedPanels ?? [])
  let isFullscreen = seed.isFullscreen ?? false
  // The state object is rebuilt only on change, so `getState()` answers the
  // same reference until then — useSyncExternalStore's snapshot contract.
  let cachedState: WorkspaceState | null = null
  const stateOf = (): WorkspaceState => {
    cachedState ??= {
      layout,
      activePanel,
      collapsedPanels: new Set(collapsedPanels),
      isFullscreen,
    }
    return cachedState
  }
  const touch = (): void => {
    cachedState = null
  }
  const emit = (): void => {
    for (const subscriber of [...subscribers]) subscriber(stateOf())
  }
  const provider: WorkspaceProvider = {
    name: 'conformance-workspace',
    getLayout: () => {
      record('workspace.getLayout', [])
      return layout
    },
    setLayout: (next) => {
      record('workspace.setLayout', [next])
      layout = next
      touch()
      emit()
    },
    togglePanel: (panelId) => {
      record('workspace.togglePanel', [panelId])
      layout = {
        ...layout,
        panels: layout.panels.map((panel) =>
          panel.id === panelId ? { ...panel, visible: !panel.visible } : panel,
        ),
      }
      touch()
      emit()
    },
    resizePanel: (panelId, size) => {
      record('workspace.resizePanel', [panelId, size])
      const index = layout.panels.findIndex((panel) => panel.id === panelId)
      if (index < 0) return
      const panels = [...layout.panels]
      const previous = panels[index]
      const sizes = { ...layout.sizes }
      const positionIndex = layout.panels
        .filter((panel) => panel.position === previous.position)
        .indexOf(previous)
      sizes[previous.position] = [...sizes[previous.position]]
      sizes[previous.position][positionIndex] = size
      panels[index] = { ...previous, defaultSize: size }
      layout = { panels, sizes }
      touch()
      emit()
    },
    setActivePanel: (panelId) => {
      record('workspace.setActivePanel', [panelId])
      activePanel = panelId
      touch()
      emit()
    },
    subscribe: (callback) => {
      record('workspace.subscribe', [])
      subscribers.add(callback)
      listeners['native.workspace'] = subscribers.size
      return () => {
        subscribers.delete(callback)
        listeners['native.workspace'] = subscribers.size
      }
    },
    resetLayout: () => {
      record('workspace.resetLayout', [])
      layout = defaultLayout
      activePanel = null
      collapsedPanels = new Set()
      isFullscreen = false
      touch()
      emit()
    },
    ...(seed.fullState
      ? {
          getState: (): WorkspaceState => {
            record('workspace.getState', [])
            return stateOf()
          },
        }
      : {}),
  }
  const driver = {
    /** Notifies subscribers with the current state (an outside nudge). */
    emit: (): void => {
      emit()
    },
  }
  return { provider, driver }
}

/**
 * Builds the recording code-editor service. Tabs carry an `isActive` flag the
 * fake keeps consistent (opening or activating a tab deactivates the others);
 * content changes notify `onChange` listeners with a monotonic version.
 *
 * @param seed - The case's editor seed.
 * @param record - Receives every call (`editor.openFile`, …).
 * @param listeners - Filled with the provider's live listener counts.
 * @returns The provider and its outside drivers.
 */
function createEditorFake(
  seed: EditorSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): Driven<EditorProvider> {
  const labelOf = (path: string): string => path.split('/').pop() ?? path
  let tabs: EditorTab[] = (seed.tabs ?? []).map((tab) => ({ ...tab }))
  const contents = new Map<string, string>()
  for (const tab of tabs) contents.set(tab.path, seed.content ?? '')
  let version = 0
  const changeListeners = new Set<(event: EditorChangeEvent) => void>()
  const fixListeners = new Set<(request: FixWithAIRequest) => void>()
  const syncCounts = (): void => {
    listeners['native.editor.changes'] = changeListeners.size
    listeners['native.editor.fixWithAI'] = fixListeners.size
  }
  const emitChange = (path: string, content: string): void => {
    version++
    for (const listener of [...changeListeners]) listener({ path, content, version })
  }
  const activate = (path: string): void => {
    tabs = tabs.map((tab) => ({ ...tab, isActive: tab.path === path }))
  }
  const openTab = (file: EditorFile): void => {
    tabs = [
      ...tabs.filter((tab) => tab.path !== file.path).map((tab) => ({ ...tab, isActive: false })),
      {
        path: file.path,
        label: labelOf(file.path),
        isDirty: file.isDirty ?? false,
        isActive: true,
        ...(file.isPreview ? { isPreview: true } : {}),
      },
    ]
    contents.set(file.path, file.content ?? '')
  }
  const provider: EditorProvider = {
    name: 'conformance-editor',
    mount: (element, config) => {
      record('editor.mount', [element, config])
    },
    dispose: () => {
      record('editor.dispose', [])
    },
    openFile: (file) => {
      record('editor.openFile', [file])
      openTab(file)
      activate(file.path)
    },
    closeFile: (path) => {
      record('editor.closeFile', [path])
      const wasActive = tabs.find((tab) => tab.path === path)?.isActive ?? false
      tabs = tabs.filter((tab) => tab.path !== path)
      if (wasActive && tabs.length > 0) activate(tabs[tabs.length - 1].path)
    },
    getContent: () => {
      record('editor.getContent', [])
      const active = tabs.find((tab) => tab.isActive)
      return active ? (contents.get(active.path) ?? null) : null
    },
    setContent: (path, content) => {
      record('editor.setContent', [path, content])
      contents.set(path, content)
      tabs = tabs.map((tab) => (tab.path === path ? { ...tab, isDirty: true } : tab))
      emitChange(path, content)
    },
    getCursorPosition: (): EditorPosition | null => null,
    setCursorPosition: (position) => {
      record('editor.setCursorPosition', [position])
    },
    focus: () => {
      record('editor.focus', [])
    },
    onChange: (callback) => {
      record('editor.onChange', [])
      changeListeners.add(callback)
      syncCounts()
      return () => {
        changeListeners.delete(callback)
        syncCounts()
      }
    },
    getTabs: () => {
      record('editor.getTabs', [])
      return tabs.map((tab) => ({ ...tab }))
    },
    setActiveTab: (path) => {
      record('editor.setActiveTab', [path])
      activate(path)
    },
    updateConfig: (config: EditorConfig) => {
      record('editor.updateConfig', [config])
    },
    openDiff: (file: DiffFile) => {
      record('editor.openDiff', [file])
      tabs = [
        ...tabs.map((tab) => ({ ...tab, isActive: false })),
        {
          path: file.path,
          label: `${labelOf(file.path)} (diff)`,
          isDirty: false,
          isActive: true,
          isDiff: true,
        },
      ]
    },
    closeDiff: () => {
      record('editor.closeDiff', [])
      tabs = tabs.filter((tab) => !tab.isDiff)
      if (tabs.length > 0) activate(tabs[tabs.length - 1].path)
    },
    pinTab: (path) => {
      record('editor.pinTab', [path])
      tabs = tabs.map((tab) => (tab.path === path ? { ...tab, isPreview: false } : tab))
    },
    addExtraLib: (content, filePath) => {
      record('editor.addExtraLib', [content, filePath])
    },
    onFixWithAI: (callback) => {
      record('editor.onFixWithAI', [])
      fixListeners.add(callback)
      syncCounts()
      return () => {
        fixListeners.delete(callback)
        syncCounts()
      }
    },
  }
  const driver = {
    /** Opens a tab and notifies listeners, as another part of the app would. */
    openFromOutside: (path: unknown, content: unknown): void => {
      const file: EditorFile = {
        path: String(path ?? 'src/outside.ts'),
        content: String(content ?? 'outside content'),
      }
      openTab(file)
      activate(file.path)
      emitChange(file.path, file.content)
    },
    /** Emits a Fix-with-AI request at the registered listeners, as the editor UI would. */
    fixWithAI: (path: unknown, line: unknown): void => {
      const request: FixWithAIRequest = {
        path: String(path ?? 'src/app.ts'),
        diagnostics: [],
        codeContext: 'export function add(a: number, b: number) {',
        selectedCode: 'a + b',
        ...(line === undefined ? {} : { line: Number(line) }),
      }
      for (const listener of [...fixListeners]) listener(request)
    },
  }
  return { provider, driver }
}

/**
 * Builds the recording live-preview service. Navigation keeps a history list:
 * `setUrl`/`navigateTo` push a new entry (truncating forward) and bump
 * `loadNonce`; `recordNavigation` updates the displayed URL only (a replace
 * keeps the forward stack); `back`/`forward` move within it without reloading.
 *
 * @param seed - The case's preview seed.
 * @param record - Receives every call (`preview.setUrl`, …).
 * @param listeners - Filled with the provider's live subscriber count.
 * @returns The provider and its outside drivers.
 */
function createPreviewFake(
  seed: PreviewSeed,
  record: (name: string, args: unknown[]) => void,
  listeners: Record<string, number>,
): Driven<PreviewProvider> {
  const startUrl = seed.url ?? `${PREVIEW_BASE}/start`
  const subscribers = new Set<(state: PreviewState) => void>()
  let entries: string[] = [startUrl]
  let index = 0
  let state: PreviewState = {
    url: startUrl,
    currentUrl: startUrl,
    isLoading: seed.isLoading ?? false,
    device: seed.device ?? 'none',
    error: seed.error ?? null,
    isConnected: seed.isConnected ?? true,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const flags = (): void => {
    state = { ...state, canGoBack: index > 0, canGoForward: index < entries.length - 1 }
  }
  const emit = (): void => {
    for (const subscriber of [...subscribers]) subscriber({ ...state })
  }
  const load = (url: string): void => {
    if (url === state.url) return
    entries = [...entries.slice(0, index + 1), url]
    index = entries.length - 1
    state = { ...state, url, currentUrl: url, loadNonce: state.loadNonce + 1 }
    flags()
  }
  const provider: PreviewProvider = {
    name: 'conformance-preview',
    setUrl: (url) => {
      record('preview.setUrl', [url])
      load(url)
      emit()
    },
    getUrl: () => {
      record('preview.getUrl', [])
      return state.url
    },
    refresh: () => {
      record('preview.refresh', [])
      state = { ...state, loadNonce: state.loadNonce + 1 }
      emit()
    },
    setDevice: (device) => {
      record('preview.setDevice', [device])
      state = { ...state, device }
      emit()
    },
    getState: () => {
      record('preview.getState', [])
      return { ...state }
    },
    navigateTo: (path) => {
      record('preview.navigateTo', [path])
      load(path.startsWith('http') ? path : `${PREVIEW_BASE}${path}`)
      emit()
    },
    recordNavigation: (url, isReplace) => {
      record('preview.recordNavigation', [url, isReplace])
      state = { ...state, currentUrl: url }
      if (isReplace) entries[index] = url
      else {
        entries = [...entries.slice(0, index + 1), url]
        index = entries.length - 1
      }
      flags()
      emit()
    },
    back: () => {
      record('preview.back', [])
      if (index === 0) return
      index--
      state = { ...state, currentUrl: entries[index] }
      flags()
      emit()
    },
    forward: () => {
      record('preview.forward', [])
      if (index >= entries.length - 1) return
      index++
      state = { ...state, currentUrl: entries[index] }
      flags()
      emit()
    },
    canGoBack: () => {
      record('preview.canGoBack', [])
      return state.canGoBack
    },
    canGoForward: () => {
      record('preview.canGoForward', [])
      return state.canGoForward
    },
    subscribe: (callback) => {
      record('preview.subscribe', [])
      subscribers.add(callback)
      listeners['native.preview'] = subscribers.size
      return () => {
        subscribers.delete(callback)
        listeners['native.preview'] = subscribers.size
      }
    },
    openExternal: () => {
      // The real provider opens a window; a fake must not.
      record('preview.openExternal', [])
    },
  }
  const driver = {
    /** Changes the loading flag, as the iframe load lifecycle would. */
    setLoading: (value: unknown): void => {
      state = { ...state, isLoading: value === true }
      emit()
    },
    /** Sets or clears the preview error, as a failed load would. */
    setError: (value: unknown): void => {
      state = { ...state, error: value === null || value === undefined ? null : String(value) }
      emit()
    },
    /** Flips the connection flag, as the preview socket would. */
    setConnected: (value: unknown): void => {
      state = { ...state, isConnected: value === true }
      emit()
    },
  }
  return { provider, driver }
}

/**
 * Builds this area's fakes for one case: a no-op unless the case seeds
 * `context.areas.native`.
 *
 * @param context - The case context (`context.areas?.native` is this area's seed).
 * @param record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createNativeFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.native
  if (!seed) return {}
  const listeners: Record<string, number> = {}
  const controls: Record<string, (...args: unknown[]) => unknown> = {}
  const teardowns: (() => void)[] = []
  const services: AreaFakes['services'] = {}
  const addTeardown = (teardown: () => void): void => {
    teardowns.push(teardown)
  }

  if (seed.device) {
    const restoreDevice = saveBonds(['device'])
    setDeviceProvider(createDeviceFake(seed.device, record))
    addTeardown(restoreDevice)
  }

  if (seed.platform) addTeardown(stubPlatformGlobals(seed.platform))

  // useCapacitorApp's push init reads the push bond, so a capacitor case with
  // push notifications gets the fake provider too (with its register failure).
  const pushSeed =
    seed.push || seed.capacitor
      ? {
          ...seed.push,
          ...(seed.capacitor?.pushError ? { registerError: seed.capacitor.pushError } : {}),
        }
      : undefined
  if (pushSeed) {
    const push = createPushFake(pushSeed, record, listeners)
    const restorePush = saveBonds(['push'])
    setPushProvider(push.provider)
    addTeardown(restorePush)
    controls['native.push.receive'] = push.driver.receive
    controls['native.push.action'] = push.driver.action
    controls['native.push.token'] = push.driver.token
    controls['native.push.setPermission'] = push.driver.setPermission
    controls['native.push.settlePermission'] = push.driver.settlePermission
    controls['native.push.settleRegister'] = push.driver.settleRegister
  }

  if (seed.version) {
    const version = createVersionFake(seed.version, record, listeners)
    const restoreVersion = saveBonds(['version'])
    setVersionProvider(version.provider)
    addTeardown(restoreVersion)
    // Cleared last, so a still-running interval can never outlive the case.
    addTeardown(version.stopPeriodicChecks)
    controls['native.version.settleCheck'] = version.driver.settleCheck
    controls['native.version.updateAvailable'] = version.driver.updateAvailable
    controls['native.version.serviceWorkerWaiting'] = version.driver.serviceWorkerWaiting
  }

  if (seed.capacitor) {
    const restoreLifecycle = saveBonds(['lifecycle'])
    setLifecycleProvider(createLifecycleFake(seed.capacitor, record, listeners))
    addTeardown(restoreLifecycle)
  }

  if (seed.workspace) {
    const workspace = createWorkspaceFake(seed.workspace, record, listeners)
    services.workspace = workspace.provider
    controls['native.workspace.emit'] = workspace.driver.emit
  }

  if (seed.editor) {
    const editor = createEditorFake(seed.editor, record, listeners)
    services.editor = editor.provider
    controls['native.editor.openFromOutside'] = editor.driver.openFromOutside
    controls['native.editor.fixWithAI'] = editor.driver.fixWithAI
  }

  if (seed.preview) {
    const preview = createPreviewFake(seed.preview, record, listeners)
    services.preview = preview.provider
    controls['native.preview.setLoading'] = preview.driver.setLoading
    controls['native.preview.setError'] = preview.driver.setError
    controls['native.preview.setConnected'] = preview.driver.setConnected
  }

  return {
    services,
    controls,
    listeners: () => ({ ...listeners }),
    dispose: () => {
      for (const teardown of teardowns.reverse()) teardown()
    },
  }
}
