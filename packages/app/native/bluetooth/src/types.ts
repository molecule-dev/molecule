/**
 * Bluetooth types for molecule.dev.
 *
 * @module
 */

/**
 * Bluetooth device
 */
export interface BluetoothDevice {
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

/**
 * Bluetooth service
 */
export interface BluetoothService {
  /** Service UUID */
  uuid: string
  /** Whether service is primary */
  isPrimary: boolean
  /** Service characteristics */
  characteristics: BluetoothCharacteristic[]
}

/**
 * Bluetooth characteristic
 */
export interface BluetoothCharacteristic {
  /** Characteristic UUID */
  uuid: string
  /** Service UUID */
  serviceUuid: string
  /** Characteristic properties */
  properties: CharacteristicProperties
  /** Current value (base64) */
  value?: string
}

/**
 * Characteristic properties
 */
export interface CharacteristicProperties {
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

/**
 * Options for scanning BLE devices (service UUID filter, timeout, scan mode).
 */
export interface ScanOptions {
  /** Service UUIDs to filter by */
  services?: string[]
  /** Allow duplicates */
  allowDuplicates?: boolean
  /** Scan timeout in ms */
  timeout?: number
  /** Scan mode (Android) */
  scanMode?: 'lowPower' | 'balanced' | 'lowLatency'
}

/**
 * Connect options
 */
export interface ConnectOptions {
  /** Connection timeout in ms */
  timeout?: number
  /** Auto-connect when available */
  autoConnect?: boolean
}

/**
 * Options for writing to a BLE characteristic (response mode, chunk size).
 */
export interface WriteOptions {
  /** Write without response */
  withoutResponse?: boolean
}

/**
 * Bluetooth state
 */
export type BluetoothState =
  | 'poweredOn'
  | 'poweredOff'
  | 'resetting'
  | 'unauthorized'
  | 'unsupported'
  | 'unknown'

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting'

/**
 * Bluetooth capabilities
 */
export interface BluetoothCapabilities {
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

/**
 * Bluetooth permission status
 */
export type BluetoothPermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited' | 'unsupported'

/**
 * Bluetooth provider interface
 */
export interface BluetoothProvider {
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
