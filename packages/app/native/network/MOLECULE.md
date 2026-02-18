# @molecule/app-network

Network status interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-network
```

## API

### Interfaces

#### `NetworkCapabilities`

Network capabilities

```typescript
interface NetworkCapabilities {
  /** Whether network monitoring is supported */
  supported: boolean
  /** Whether connection type detection is supported */
  canDetectConnectionType: boolean
  /** Whether cellular generation detection is supported */
  canDetectCellularGeneration: boolean
  /** Whether speed estimation is supported */
  canEstimateSpeed: boolean
  /** Whether metered detection is supported */
  canDetectMetered: boolean
}
```

#### `NetworkChangeEvent`

Network change event

```typescript
interface NetworkChangeEvent {
  /** Previous network status */
  previous: NetworkStatus
  /** Current network status */
  current: NetworkStatus
  /** Whether connectivity changed */
  connectivityChanged: boolean
  /** Whether connection type changed */
  connectionTypeChanged: boolean
}
```

#### `NetworkProvider`

Network provider interface

```typescript
interface NetworkProvider {
  /**
   * Get the current network status.
   * @returns The network status including connectivity, connection type, speed, and metering.
   */
  getStatus(): Promise<NetworkStatus>

  /**
   * Check if the device has an active network connection.
   * @returns Whether the device is connected to a network.
   */
  isConnected(): Promise<boolean>

  /**
   * Get the current connection type.
   * @returns The connection type: 'wifi', 'cellular', 'ethernet', 'bluetooth', 'vpn', 'other', 'none', or 'unknown'.
   */
  getConnectionType(): Promise<ConnectionType>

  /**
   * Listen for network status changes
   * @param callback - Called when network status changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: NetworkChangeEvent) => void): () => void

  /**
   * Listen for online events
   * @param callback - Called when device comes online
   * @returns Unsubscribe function
   */
  onOnline(callback: () => void): () => void

  /**
   * Listen for offline events
   * @param callback - Called when device goes offline
   * @returns Unsubscribe function
   */
  onOffline(callback: () => void): () => void

  /**
   * Perform an active network connectivity check by reaching a URL.
   * @param url - URL to test against (default: platform-specific).
   * @returns Whether the connectivity check succeeded.
   */
  checkConnectivity(url?: string): Promise<boolean>

  /**
   * Get the platform's network monitoring capabilities.
   * @returns The capabilities indicating which network features are supported.
   */
  getCapabilities(): Promise<NetworkCapabilities>
}
```

#### `NetworkStatus`

Current network connectivity status (connected, type, cellular generation, metered, airplane mode).

```typescript
interface NetworkStatus {
  /** Whether device is connected */
  connected: boolean
  /** Connection type */
  connectionType: ConnectionType
  /** Cellular generation (if cellular) */
  cellularGeneration?: CellularGeneration
  /** Whether connection is metered (e.g., cellular) */
  isMetered?: boolean
  /** Whether device is in airplane mode */
  isAirplaneMode?: boolean
  /** Approximate download speed in Mbps (if available) */
  downlinkSpeed?: number
  /** Approximate upload speed in Mbps (if available) */
  uplinkSpeed?: number
  /** Round-trip time in ms (if available) */
  rtt?: number
  /** Whether save-data mode is enabled */
  saveData?: boolean
}
```

### Types

#### `CellularGeneration`

Cellular connection generation

```typescript
type CellularGeneration = '2g' | '3g' | '4g' | '5g' | 'unknown'
```

#### `ConnectionType`

Network connection type

```typescript
type ConnectionType =
  | 'wifi' // Wi-Fi connection
  | 'cellular' // Cellular data
  | 'ethernet' // Wired connection
  | 'bluetooth' // Bluetooth tethering
  | 'vpn' // VPN connection
  | 'other' // Other connection type
  | 'none' // No connection
  | 'unknown'
```

### Functions

#### `checkConnectivity(url)`

Perform an active network connectivity check by reaching a URL.

```typescript
function checkConnectivity(url?: string): Promise<boolean>
```

- `url` — URL to test against (default: platform-specific).

**Returns:** Whether the connectivity check succeeded.

#### `createNetworkAwareFetch(options, options, options, options)`

Create a fetch wrapper that is aware of network connectivity. When offline, requests
are either queued (if `queueOfflineRequests` is true) or immediately rejected.
Queued requests are automatically sent when connectivity is restored.

```typescript
function createNetworkAwareFetch(options?: { onOffline?: () => void; onReconnect?: () => void; queueOfflineRequests?: boolean; }): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
```

- `options` — Configuration for offline behavior.
- `options` — .onOffline - Called when the device goes offline.
- `options` — .onReconnect - Called when the device reconnects after being offline.
- `options` — .queueOfflineRequests - If true, requests made while offline are queued and retried on reconnect.

**Returns:** A fetch-compatible function that handles offline scenarios.

#### `getCapabilities()`

Get the platform's network monitoring capabilities.

```typescript
function getCapabilities(): Promise<NetworkCapabilities>
```

**Returns:** The capabilities indicating which network features are supported.

#### `getConnectionType()`

Get the current connection type.

```typescript
function getConnectionType(): Promise<ConnectionType>
```

**Returns:** The connection type: 'wifi', 'cellular', 'ethernet', etc.

#### `getConnectionTypeName(type, t)`

Get a human-readable display name for a connection type. Supports optional i18n
translation via a provided `t` function, falling back to English defaults.

```typescript
function getConnectionTypeName(type: ConnectionType, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `type` — The connection type to get a name for.
- `t` — Optional i18n translation function for localized names.

**Returns:** The localized or default display name for the connection type.

#### `getProvider()`

Get the current network provider.

```typescript
function getProvider(): NetworkProvider
```

**Returns:** The active NetworkProvider instance.

#### `getStatus()`

Get the current network status.

```typescript
function getStatus(): Promise<NetworkStatus>
```

**Returns:** The network status including connectivity, connection type, speed, and metering.

#### `hasProvider()`

Check if a network provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a NetworkProvider has been bonded.

#### `isConnected()`

Check if the device has an active network connection.

```typescript
function isConnected(): Promise<boolean>
```

**Returns:** Whether the device is connected to a network.

#### `isSuitableForLargeDownload(status)`

Check whether the current network status is suitable for large downloads.
Returns false if disconnected, metered, save-data is enabled, or on a cellular connection.

```typescript
function isSuitableForLargeDownload(status: NetworkStatus): boolean
```

- `status` — The current network status to evaluate.

**Returns:** Whether the network conditions are favorable for large downloads.

#### `onChange(callback)`

Listen for network status changes.

```typescript
function onChange(callback: (event: NetworkChangeEvent) => void): () => void
```

- `callback` — Called with a NetworkChangeEvent when connectivity or connection type changes.

**Returns:** A function that unsubscribes the listener when called.

#### `onOffline(callback)`

Listen for the device going offline.

```typescript
function onOffline(callback: () => void): () => void
```

- `callback` — Called when the device loses network connectivity.

**Returns:** A function that unsubscribes the listener when called.

#### `onOnline(callback)`

Listen for the device coming online.

```typescript
function onOnline(callback: () => void): () => void
```

- `callback` — Called when the device regains network connectivity.

**Returns:** A function that unsubscribes the listener when called.

#### `setProvider(provider)`

Set the network provider.

```typescript
function setProvider(provider: NetworkProvider): void
```

- `provider` — NetworkProvider implementation to register.

#### `waitForConnection(timeout, checkInterval)`

Wait for a network connection to become available, polling at regular intervals.
Resolves `true` once connected, or `false` if the timeout elapses without connectivity.

```typescript
function waitForConnection(timeout?: number, checkInterval?: number): Promise<boolean>
```

- `timeout` — Maximum wait time in milliseconds before giving up (default: 30000).
- `checkInterval` — Interval in milliseconds between connectivity checks (default: 1000).

**Returns:** Whether a network connection was established within the timeout.

#### `whenOnline(callback, timeout)`

Execute a callback once the device is online. If already connected, runs immediately.
If offline, waits up to `timeout` ms for connectivity before throwing.

```typescript
function whenOnline(callback: () => T | Promise<T>, timeout?: number): Promise<T>
```

- `callback` — Function to execute once online. May be sync or async.
- `timeout` — Maximum time in milliseconds to wait for connectivity (default: 30000).

**Returns:** The return value of the callback.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-network`.
