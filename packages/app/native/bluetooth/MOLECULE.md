# @molecule/app-bluetooth

`@molecule/app-bluetooth`
Bluetooth access interface for molecule.dev

Provides a unified API for Bluetooth Low Energy (BLE) operations.
Supports scanning, connecting, reading/writing characteristics.

## Type
`native`

## Installation
```bash
npm install @molecule/app-bluetooth
```

## API

### Interfaces

#### `BluetoothCapabilities`

Bluetooth capabilities

```typescript
interface BluetoothCapabilities {
  /** Whether Bluetooth is supported */
  supported: boolean
  /** Current Bluetooth state */
  state: BluetoothState
  /** Whether scanning is supported */
  canScan: boolean
  /** Whether connecting is supported */
  canConnect: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether notifications are supported */
  canNotify: boolean
}
```

#### `BluetoothCharacteristic`

Bluetooth characteristic

```typescript
interface BluetoothCharacteristic {
  /** Characteristic UUID */
  uuid: string
  /** Service UUID */
  serviceUuid: string
  /** Characteristic properties */
  properties: CharacteristicProperties
  /** Current value (base64) */
  value?: string
}
```

#### `BluetoothDevice`

Bluetooth device

```typescript
interface BluetoothDevice {
  /** Device ID/address */
  id: string
  /** Device name */
  name?: string
  /** Local name (advertised) */
  localName?: string
  /** RSSI signal strength */
  rssi?: number
  /** Manufacturer data */
  manufacturerData?: Record<string, ArrayBuffer>
  /** Service data */
  serviceData?: Record<string, ArrayBuffer>
  /** Advertised service UUIDs */
  serviceUUIDs?: string[]
  /** Whether device is connectable */
  connectable?: boolean
  /** TX power level */
  txPowerLevel?: number
}
```

#### `BluetoothProvider`

Bluetooth provider interface

```typescript
interface BluetoothProvider {
  /**
   * Start scanning for devices
   * @param callback - Called for each device found
   * @param options - Scan options
   */
  startScan(callback: (device: BluetoothDevice) => void, options?: ScanOptions): () => void

  /**
   * Scan for a single device
   * @param options - Scan options
   */
  scanOnce(options?: ScanOptions): Promise<BluetoothDevice[]>

  /**
   * Connect to a device
   * @param deviceId - Device ID
   * @param options - Connect options
   */
  connect(deviceId: string, options?: ConnectOptions): Promise<void>

  /**
   * Disconnect from a device
   * @param deviceId - Device ID
   */
  disconnect(deviceId: string): Promise<void>

  /**
   * Get the connection state of a device.
   * @param deviceId - Device ID to check.
   * @returns The connection state: 'disconnected', 'connecting', 'connected', or 'disconnecting'.
   */
  getConnectionState(deviceId: string): Promise<ConnectionState>

  /**
   * Discover services
   * @param deviceId - Device ID
   */
  discoverServices(deviceId: string): Promise<BluetoothService[]>

  /**
   * Read characteristic value
   * @param deviceId - Device ID
   * @param serviceUuid - Service UUID
   * @param characteristicUuid - Characteristic UUID
   */
  read(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<ArrayBuffer>

  /**
   * Write characteristic value
   * @param deviceId - Device ID
   * @param serviceUuid - Service UUID
   * @param characteristicUuid - Characteristic UUID
   * @param value - Value to write
   * @param options - Write options
   */
  write(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    value: ArrayBuffer,
    options?: WriteOptions,
  ): Promise<void>

  /**
   * Start notifications for characteristic
   * @param deviceId - Device ID
   * @param serviceUuid - Service UUID
   * @param characteristicUuid - Characteristic UUID
   * @param callback - Called when value changes
   * @returns Stop function
   */
  startNotifications(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    callback: (value: ArrayBuffer) => void,
  ): () => void

  /**
   * Get Bluetooth state
   */
  getState(): Promise<BluetoothState>

  /**
   * Check if Bluetooth is enabled
   */
  isEnabled(): Promise<boolean>

  /**
   * Request to enable Bluetooth
   */
  requestEnable(): Promise<boolean>

  /**
   * Open Bluetooth settings
   */
  openSettings(): Promise<void>

  /**
   * Get the current Bluetooth permission status.
   * @returns The permission status: 'granted', 'denied', 'prompt', 'limited', or 'unsupported'.
   */
  getPermissionStatus(): Promise<BluetoothPermissionStatus>

  /**
   * Request Bluetooth permissions from the user.
   * @returns The resulting permission status after the request.
   */
  requestPermission(): Promise<BluetoothPermissionStatus>

  /**
   * Listen for Bluetooth state changes
   * @param callback - Called when state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: BluetoothState) => void): () => void

  /**
   * Listen for device disconnection
   * @param deviceId - Device ID
   * @param callback - Called when disconnected
   * @returns Unsubscribe function
   */
  onDisconnect(deviceId: string, callback: () => void): () => void

  /**
   * Get the platform's Bluetooth capabilities.
   * @returns The capabilities indicating which Bluetooth features are available.
   */
  getCapabilities(): Promise<BluetoothCapabilities>
}
```

#### `BluetoothService`

Bluetooth service

```typescript
interface BluetoothService {
  /** Service UUID */
  uuid: string
  /** Whether service is primary */
  isPrimary: boolean
  /** Service characteristics */
  characteristics: BluetoothCharacteristic[]
}
```

#### `CharacteristicProperties`

Characteristic properties

```typescript
interface CharacteristicProperties {
  /** Can read value */
  read: boolean
  /** Can write value */
  write: boolean
  /** Can write without response */
  writeWithoutResponse: boolean
  /** Supports notifications */
  notify: boolean
  /** Supports indications */
  indicate: boolean
}
```

#### `ConnectOptions`

Connect options

```typescript
interface ConnectOptions {
  /** Connection timeout in ms */
  timeout?: number
  /** Auto-connect when available */
  autoConnect?: boolean
}
```

#### `ScanOptions`

Options for scanning BLE devices (service UUID filter, timeout, scan mode).

```typescript
interface ScanOptions {
  /** Service UUIDs to filter by */
  services?: string[]
  /** Allow duplicates */
  allowDuplicates?: boolean
  /** Scan timeout in ms */
  timeout?: number
  /** Scan mode (Android) */
  scanMode?: 'lowPower' | 'balanced' | 'lowLatency'
}
```

#### `WriteOptions`

Options for writing to a BLE characteristic (response mode, chunk size).

```typescript
interface WriteOptions {
  /** Write without response */
  withoutResponse?: boolean
}
```

### Types

#### `BluetoothPermissionStatus`

Bluetooth permission status

```typescript
type BluetoothPermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited' | 'unsupported'
```

#### `BluetoothState`

Bluetooth state

```typescript
type BluetoothState =
  | 'poweredOn'
  | 'poweredOff'
  | 'resetting'
  | 'unauthorized'
  | 'unsupported'
  | 'unknown'
```

#### `ConnectionState`

Connection state

```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting'
```

### Functions

#### `bufferToHex(buffer)`

Convert an ArrayBuffer to a hexadecimal string.

```typescript
function bufferToHex(buffer: ArrayBuffer): string
```

- `buffer` — The ArrayBuffer to convert.

**Returns:** The hex string representation (e.g., "0a1b2c").

#### `bufferToString(buffer)`

Convert an ArrayBuffer to a UTF-8 string.

```typescript
function bufferToString(buffer: ArrayBuffer): string
```

- `buffer` — The ArrayBuffer to decode.

**Returns:** The decoded string.

#### `connect(deviceId, options)`

Connect to a Bluetooth device.

```typescript
function connect(deviceId: string, options?: ConnectOptions): Promise<void>
```

- `deviceId` — The device ID/address to connect to.
- `options` — Connection options (timeout, auto-connect).

**Returns:** A promise that resolves when the connection is established.

#### `disconnect(deviceId)`

Disconnect from a Bluetooth device.

```typescript
function disconnect(deviceId: string): Promise<void>
```

- `deviceId` — The device ID/address to disconnect from.

**Returns:** A promise that resolves when the device is disconnected.

#### `discoverServices(deviceId)`

Discover GATT services on a connected Bluetooth device.

```typescript
function discoverServices(deviceId: string): Promise<BluetoothService[]>
```

- `deviceId` — The device ID/address to discover services on.

**Returns:** An array of discovered BluetoothService objects with their characteristics.

#### `expandUuid(shortUuid)`

Convert a short BLE UUID (16-bit or 32-bit) to the full 128-bit UUID format.

```typescript
function expandUuid(shortUuid: string): string
```

- `shortUuid` — The 4-character (16-bit) or 8-character (32-bit) UUID to expand.

**Returns:** The full 128-bit UUID string with the standard BLE base UUID.

#### `getCapabilities()`

Get the platform's Bluetooth capabilities.

```typescript
function getCapabilities(): Promise<BluetoothCapabilities>
```

**Returns:** The capabilities indicating which Bluetooth features are supported.

#### `getConnectionState(deviceId)`

Get the connection state of a Bluetooth device.

```typescript
function getConnectionState(deviceId: string): Promise<ConnectionState>
```

- `deviceId` — The device ID/address to check.

**Returns:** The connection state: 'disconnected', 'connecting', 'connected', or 'disconnecting'.

#### `getPermissionStatus()`

Get the current Bluetooth permission status.

```typescript
function getPermissionStatus(): Promise<BluetoothPermissionStatus>
```

**Returns:** The permission status: 'granted', 'denied', 'prompt', 'limited', or 'unsupported'.

#### `getProvider()`

Get the current Bluetooth provider.

```typescript
function getProvider(): BluetoothProvider
```

**Returns:** The active BluetoothProvider instance.

#### `getState()`

Get the current Bluetooth adapter state.

```typescript
function getState(): Promise<BluetoothState>
```

**Returns:** The state: 'poweredOn', 'poweredOff', 'resetting', 'unauthorized', 'unsupported', or 'unknown'.

#### `hasProvider()`

Check if a Bluetooth provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a BluetoothProvider has been set via setProvider.

#### `hexToBuffer(hex)`

Convert a hexadecimal string to an ArrayBuffer.

```typescript
function hexToBuffer(hex: string): ArrayBuffer
```

- `hex` — The hex string to convert (e.g., "0a1b2c").

**Returns:** The decoded ArrayBuffer.

#### `isEnabled()`

Check if Bluetooth is enabled on the device.

```typescript
function isEnabled(): Promise<boolean>
```

**Returns:** Whether Bluetooth is currently powered on.

#### `normalizeUuid(uuid)`

Normalize a UUID to lowercase with standard dash separators.

```typescript
function normalizeUuid(uuid: string): string
```

- `uuid` — The UUID string to normalize (any format).

**Returns:** The normalized UUID string in lowercase with dashes.

#### `onDisconnect(deviceId, callback)`

Listen for device disconnection events.

```typescript
function onDisconnect(deviceId: string, callback: () => void): () => void
```

- `deviceId` — The device ID/address to monitor.
- `callback` — Called when the device disconnects.

**Returns:** A function that unsubscribes the listener when called.

#### `onStateChange(callback)`

Listen for Bluetooth adapter state changes.

```typescript
function onStateChange(callback: (state: BluetoothState) => void): () => void
```

- `callback` — Called with the new BluetoothState whenever it changes.

**Returns:** A function that unsubscribes the listener when called.

#### `openSettings()`

Open the system Bluetooth settings screen.

```typescript
function openSettings(): Promise<void>
```

**Returns:** A promise that resolves when the settings screen is opened.

#### `read(deviceId, serviceUuid, characteristicUuid)`

Read a characteristic value from a connected Bluetooth device.

```typescript
function read(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<ArrayBuffer>
```

- `deviceId` — The device ID/address.
- `serviceUuid` — The GATT service UUID.
- `characteristicUuid` — The GATT characteristic UUID.

**Returns:** The characteristic value as an ArrayBuffer.

#### `requestEnable()`

Request the user to enable Bluetooth.

```typescript
function requestEnable(): Promise<boolean>
```

**Returns:** Whether Bluetooth was enabled after the request.

#### `requestPermission()`

Request Bluetooth permissions from the user.

```typescript
function requestPermission(): Promise<BluetoothPermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `scanOnce(options)`

Scan for Bluetooth devices and return all found within the timeout period.

```typescript
function scanOnce(options?: ScanOptions): Promise<BluetoothDevice[]>
```

- `options` — Scan options (service filter, timeout, scan mode).

**Returns:** An array of discovered BluetoothDevice objects.

#### `setProvider(provider)`

Set the Bluetooth provider.

```typescript
function setProvider(provider: BluetoothProvider): void
```

- `provider` — BluetoothProvider implementation to register.

#### `startNotifications(deviceId, serviceUuid, characteristicUuid, callback)`

Start notifications for a characteristic on a connected Bluetooth device.

```typescript
function startNotifications(deviceId: string, serviceUuid: string, characteristicUuid: string, callback: (value: ArrayBuffer) => void): () => void
```

- `deviceId` — The device ID/address.
- `serviceUuid` — The GATT service UUID.
- `characteristicUuid` — The GATT characteristic UUID to subscribe to.
- `callback` — Called with the new value whenever the characteristic changes.

**Returns:** A function that stops notifications when called.

#### `startScan(callback, options)`

Start scanning for nearby Bluetooth devices.

```typescript
function startScan(callback: (device: BluetoothDevice) => void, options?: ScanOptions): () => void
```

- `callback` — Called for each device discovered during scanning.
- `options` — Scan options (service filter, timeout, scan mode).

**Returns:** A function that stops the scan when called.

#### `stringToBuffer(str)`

Convert a string to an ArrayBuffer using UTF-8 encoding.

```typescript
function stringToBuffer(str: string): ArrayBuffer
```

- `str` — The string to encode.

**Returns:** The encoded ArrayBuffer.

#### `write(deviceId, serviceUuid, characteristicUuid, value, options)`

Write a value to a characteristic on a connected Bluetooth device.

```typescript
function write(deviceId: string, serviceUuid: string, characteristicUuid: string, value: ArrayBuffer, options?: WriteOptions): Promise<void>
```

- `deviceId` — The device ID/address.
- `serviceUuid` — The GATT service UUID.
- `characteristicUuid` — The GATT characteristic UUID.
- `value` — The value to write as an ArrayBuffer.
- `options` — Write options (e.g., write without response).

**Returns:** A promise that resolves when the write completes.

### Constants

#### `StandardCharacteristics`

Standard BLE characteristic UUIDs

```typescript
const StandardCharacteristics: { readonly DEVICE_NAME: "00002a00-0000-1000-8000-00805f9b34fb"; readonly APPEARANCE: "00002a01-0000-1000-8000-00805f9b34fb"; readonly BATTERY_LEVEL: "00002a19-0000-1000-8000-00805f9b34fb"; readonly MANUFACTURER_NAME: "00002a29-0000-1000-8000-00805f9b34fb"; readonly MODEL_NUMBER: "00002a24-0000-1000-8000-00805f9b34fb"; readonly SERIAL_NUMBER: "00002a25-0000-1000-8000-00805f9b34fb"; readonly FIRMWARE_REVISION: "00002a26-0000-1000-8000-00805f9b34fb"; readonly HEART_RATE_MEASUREMENT: "00002a37-0000-1000-8000-00805f9b34fb"; }
```

#### `StandardServices`

Standard BLE service UUIDs

```typescript
const StandardServices: { readonly GENERIC_ACCESS: "00001800-0000-1000-8000-00805f9b34fb"; readonly GENERIC_ATTRIBUTE: "00001801-0000-1000-8000-00805f9b34fb"; readonly DEVICE_INFORMATION: "0000180a-0000-1000-8000-00805f9b34fb"; readonly BATTERY: "0000180f-0000-1000-8000-00805f9b34fb"; readonly HEART_RATE: "0000180d-0000-1000-8000-00805f9b34fb"; readonly HEALTH_THERMOMETER: "00001809-0000-1000-8000-00805f9b34fb"; readonly BLOOD_PRESSURE: "00001810-0000-1000-8000-00805f9b34fb"; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-bluetooth`.
