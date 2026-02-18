/**
 * Bluetooth provider management for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  BluetoothCapabilities,
  BluetoothDevice,
  BluetoothPermissionStatus,
  BluetoothProvider,
  BluetoothService,
  BluetoothState,
  ConnectionState,
  ConnectOptions,
  ScanOptions,
  WriteOptions,
} from './types.js'

let currentProvider: BluetoothProvider | null = null

/**
 * Set the Bluetooth provider.
 * @param provider - BluetoothProvider implementation to register.
 */
export function setProvider(provider: BluetoothProvider): void {
  currentProvider = provider
}

/**
 * Get the current Bluetooth provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active BluetoothProvider instance.
 */
export function getProvider(): BluetoothProvider {
  if (!currentProvider) {
    throw new Error(
      t('bluetooth.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-bluetooth: No provider set. Call setProvider() with a BluetoothProvider implementation (e.g., from @molecule/app-bluetooth-capacitor).',
      }),
    )
  }
  return currentProvider
}

/**
 * Check if a Bluetooth provider has been registered.
 * @returns Whether a BluetoothProvider has been set via setProvider.
 */
export function hasProvider(): boolean {
  return currentProvider !== null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Start scanning for nearby Bluetooth devices.
 * @param callback - Called for each device discovered during scanning.
 * @param options - Scan options (service filter, timeout, scan mode).
 * @returns A function that stops the scan when called.
 */
export function startScan(
  callback: (device: BluetoothDevice) => void,
  options?: ScanOptions,
): () => void {
  return getProvider().startScan(callback, options)
}

/**
 * Scan for Bluetooth devices and return all found within the timeout period.
 * @param options - Scan options (service filter, timeout, scan mode).
 * @returns An array of discovered BluetoothDevice objects.
 */
export async function scanOnce(options?: ScanOptions): Promise<BluetoothDevice[]> {
  return getProvider().scanOnce(options)
}

/**
 * Connect to a Bluetooth device.
 * @param deviceId - The device ID/address to connect to.
 * @param options - Connection options (timeout, auto-connect).
 * @returns A promise that resolves when the connection is established.
 */
export async function connect(deviceId: string, options?: ConnectOptions): Promise<void> {
  return getProvider().connect(deviceId, options)
}

/**
 * Disconnect from a Bluetooth device.
 * @param deviceId - The device ID/address to disconnect from.
 * @returns A promise that resolves when the device is disconnected.
 */
export async function disconnect(deviceId: string): Promise<void> {
  return getProvider().disconnect(deviceId)
}

/**
 * Get the connection state of a Bluetooth device.
 * @param deviceId - The device ID/address to check.
 * @returns The connection state: 'disconnected', 'connecting', 'connected', or 'disconnecting'.
 */
export async function getConnectionState(deviceId: string): Promise<ConnectionState> {
  return getProvider().getConnectionState(deviceId)
}

/**
 * Discover GATT services on a connected Bluetooth device.
 * @param deviceId - The device ID/address to discover services on.
 * @returns An array of discovered BluetoothService objects with their characteristics.
 */
export async function discoverServices(deviceId: string): Promise<BluetoothService[]> {
  return getProvider().discoverServices(deviceId)
}

/**
 * Read a characteristic value from a connected Bluetooth device.
 * @param deviceId - The device ID/address.
 * @param serviceUuid - The GATT service UUID.
 * @param characteristicUuid - The GATT characteristic UUID.
 * @returns The characteristic value as an ArrayBuffer.
 */
export async function read(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
): Promise<ArrayBuffer> {
  return getProvider().read(deviceId, serviceUuid, characteristicUuid)
}

/**
 * Write a value to a characteristic on a connected Bluetooth device.
 * @param deviceId - The device ID/address.
 * @param serviceUuid - The GATT service UUID.
 * @param characteristicUuid - The GATT characteristic UUID.
 * @param value - The value to write as an ArrayBuffer.
 * @param options - Write options (e.g., write without response).
 * @returns A promise that resolves when the write completes.
 */
export async function write(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  value: ArrayBuffer,
  options?: WriteOptions,
): Promise<void> {
  return getProvider().write(deviceId, serviceUuid, characteristicUuid, value, options)
}

/**
 * Start notifications for a characteristic on a connected Bluetooth device.
 * @param deviceId - The device ID/address.
 * @param serviceUuid - The GATT service UUID.
 * @param characteristicUuid - The GATT characteristic UUID to subscribe to.
 * @param callback - Called with the new value whenever the characteristic changes.
 * @returns A function that stops notifications when called.
 */
export function startNotifications(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  callback: (value: ArrayBuffer) => void,
): () => void {
  return getProvider().startNotifications(deviceId, serviceUuid, characteristicUuid, callback)
}

/**
 * Get the current Bluetooth adapter state.
 * @returns The state: 'poweredOn', 'poweredOff', 'resetting', 'unauthorized', 'unsupported', or 'unknown'.
 */
export async function getState(): Promise<BluetoothState> {
  return getProvider().getState()
}

/**
 * Check if Bluetooth is enabled on the device.
 * @returns Whether Bluetooth is currently powered on.
 */
export async function isEnabled(): Promise<boolean> {
  return getProvider().isEnabled()
}

/**
 * Request the user to enable Bluetooth.
 * @returns Whether Bluetooth was enabled after the request.
 */
export async function requestEnable(): Promise<boolean> {
  return getProvider().requestEnable()
}

/**
 * Open the system Bluetooth settings screen.
 * @returns A promise that resolves when the settings screen is opened.
 */
export async function openSettings(): Promise<void> {
  return getProvider().openSettings()
}

/**
 * Get the current Bluetooth permission status.
 * @returns The permission status: 'granted', 'denied', 'prompt', 'limited', or 'unsupported'.
 */
export async function getPermissionStatus(): Promise<BluetoothPermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request Bluetooth permissions from the user.
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<BluetoothPermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Listen for Bluetooth adapter state changes.
 * @param callback - Called with the new BluetoothState whenever it changes.
 * @returns A function that unsubscribes the listener when called.
 */
export function onStateChange(callback: (state: BluetoothState) => void): () => void {
  return getProvider().onStateChange(callback)
}

/**
 * Listen for device disconnection events.
 * @param deviceId - The device ID/address to monitor.
 * @param callback - Called when the device disconnects.
 * @returns A function that unsubscribes the listener when called.
 */
export function onDisconnect(deviceId: string, callback: () => void): () => void {
  return getProvider().onDisconnect(deviceId, callback)
}

/**
 * Get the platform's Bluetooth capabilities.
 * @returns The capabilities indicating which Bluetooth features are supported.
 */
export async function getCapabilities(): Promise<BluetoothCapabilities> {
  return getProvider().getCapabilities()
}
