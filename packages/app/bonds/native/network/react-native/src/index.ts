/**
 * React Native network status provider for molecule.dev.
 *
 * Uses `@react-native-community/netinfo` to implement the `NetworkProvider`
 * interface from `@molecule/app-network`: connection status/type, cellular
 * generation, metered detection, and online/offline/change events.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-network'
 * import { provider } from '@molecule/app-network-react-native'
 *
 * setProvider(provider)   // once, at app startup
 * ```
 *
 * @remarks
 * - **Install the `@react-native-community/netinfo` peer (>= 9).** It is
 *   imported lazily: without it every call rejects with an install hint, and
 *   `onChange`/`onOnline`/`onOffline` fail to attach (surface as an unhandled
 *   rejection) — call `await getStatus()` once at startup to fail fast.
 * - `checkConnectivity()` performs an active HTTP HEAD probe — by default to
 *   `https://clients3.google.com/generate_204`. Point `connectivityCheckUrl`
 *   (or the per-call `url` argument) at your own endpoint if third-party
 *   egress is a concern.
 * - `getCapabilities()`: connection type, cellular generation, and metered
 *   detection are supported; speed estimation is not.
 *
 * @module @molecule/app-network-react-native
 */

export * from './provider.js'
export * from './types.js'
