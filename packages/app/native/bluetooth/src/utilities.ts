/**
 * Bluetooth utility functions for molecule.dev.
 *
 * @module
 */

/**
 * Convert an ArrayBuffer to a hexadecimal string.
 * @param buffer - The ArrayBuffer to convert.
 * @returns The hex string representation (e.g., "0a1b2c").
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert a hexadecimal string to an ArrayBuffer.
 * @param hex - The hex string to convert (e.g., "0a1b2c").
 * @returns The decoded ArrayBuffer.
 */
export function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = hex.match(/.{1,2}/g) || []
  return new Uint8Array(bytes.map((b) => parseInt(b, 16))).buffer
}

/**
 * Convert an ArrayBuffer to a UTF-8 string.
 * @param buffer - The ArrayBuffer to decode.
 * @returns The decoded string.
 */
export function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

/**
 * Convert a string to an ArrayBuffer using UTF-8 encoding.
 * @param str - The string to encode.
 * @returns The encoded ArrayBuffer.
 */
export function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer
}

/**
 * Standard BLE service UUIDs
 */
export const StandardServices = {
  /** Generic Access */
  GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
  /** Generic Attribute */
  GENERIC_ATTRIBUTE: '00001801-0000-1000-8000-00805f9b34fb',
  /** Device Information */
  DEVICE_INFORMATION: '0000180a-0000-1000-8000-00805f9b34fb',
  /** Battery Service */
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  /** Heart Rate */
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  /** Health Thermometer */
  HEALTH_THERMOMETER: '00001809-0000-1000-8000-00805f9b34fb',
  /** Blood Pressure */
  BLOOD_PRESSURE: '00001810-0000-1000-8000-00805f9b34fb',
} as const

/**
 * Standard BLE characteristic UUIDs
 */
export const StandardCharacteristics = {
  /** Device Name */
  DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
  /** Appearance */
  APPEARANCE: '00002a01-0000-1000-8000-00805f9b34fb',
  /** Battery Level */
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  /** Manufacturer Name */
  MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
  /** Model Number */
  MODEL_NUMBER: '00002a24-0000-1000-8000-00805f9b34fb',
  /** Serial Number */
  SERIAL_NUMBER: '00002a25-0000-1000-8000-00805f9b34fb',
  /** Firmware Revision */
  FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
  /** Heart Rate Measurement */
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
} as const

/**
 * Convert a short BLE UUID (16-bit or 32-bit) to the full 128-bit UUID format.
 * @param shortUuid - The 4-character (16-bit) or 8-character (32-bit) UUID to expand.
 * @returns The full 128-bit UUID string with the standard BLE base UUID.
 */
export function expandUuid(shortUuid: string): string {
  if (shortUuid.length === 4) {
    return `0000${shortUuid}-0000-1000-8000-00805f9b34fb`
  }
  if (shortUuid.length === 8) {
    return `${shortUuid}-0000-1000-8000-00805f9b34fb`
  }
  return shortUuid
}

/**
 * Normalize a UUID to lowercase with standard dash separators.
 * @param uuid - The UUID string to normalize (any format).
 * @returns The normalized UUID string in lowercase with dashes.
 */
export function normalizeUuid(uuid: string): string {
  const clean = uuid.toLowerCase().replace(/-/g, '')
  if (clean.length === 32) {
    return [
      clean.slice(0, 8),
      clean.slice(8, 12),
      clean.slice(12, 16),
      clean.slice(16, 20),
      clean.slice(20),
    ].join('-')
  }
  return expandUuid(clean)
}
