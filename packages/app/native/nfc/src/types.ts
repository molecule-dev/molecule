/**
 * `@molecule/app-nfc`
 * Type definitions for NFC module
 */

/**
 * NDEF record types
 */
export type NdefRecordType =
  | 'text' // Plain text
  | 'uri' // URI/URL
  | 'mime' // MIME type data
  | 'external' // External type
  | 'empty' // Empty record
  | 'unknown' // Unknown type

/**
 * An NFC Data Exchange Format record (type, payload, optional language code and MIME type).
 */
export interface NdefRecord {
  /** Record type */
  type: NdefRecordType
  /** Type name format */
  tnf?: number
  /** Record type string */
  recordType?: string
  /** Record ID */
  id?: string
  /** Record payload (base64 for binary data) */
  payload: string
  /** Language code (for text records) */
  languageCode?: string
  /** MIME type (for mime records) */
  mimeType?: string
}

/**
 * NDEF message (collection of records)
 */
export interface NdefMessage {
  /** NDEF records */
  records: NdefRecord[]
}

/**
 * Detected NFC tag with its ID, technology types, size, writability, and NDEF message.
 */
export interface NfcTag {
  /** Tag ID (hex string) */
  id: string
  /** Tag technology types */
  techTypes: string[]
  /** Maximum message size in bytes */
  maxSize?: number
  /** Whether tag is writable */
  isWritable?: boolean
  /** Whether tag can be made read-only */
  canMakeReadOnly?: boolean
  /** NDEF message (if present) */
  message?: NdefMessage
}

/**
 * NFC scan options
 */
export interface NfcScanOptions {
  /** Keep scanning after first tag */
  keepSessionAlive?: boolean
  /** Alert message (iOS) */
  alertMessage?: string
  /** Scan timeout in ms (0 = no timeout) */
  timeout?: number
}

/**
 * NFC write options
 */
export interface NfcWriteOptions {
  /** Make tag read-only after write */
  makeReadOnly?: boolean
  /** Alert message (iOS) */
  alertMessage?: string
}

/**
 * NFC capabilities
 */
export interface NfcCapabilities {
  /** Whether NFC is supported */
  supported: boolean
  /** Whether NFC is enabled */
  enabled: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether background reading is supported */
  canReadBackground: boolean
  /** Supported tag types */
  supportedTagTypes: string[]
}

/**
 * NFC permission status
 */
export type NfcPermissionStatus = 'granted' | 'denied' | 'prompt' | 'disabled' | 'unsupported'

/**
 * NFC provider interface
 */
export interface NfcProvider {
  /**
   * Start scanning for NFC tags
   * @param callback - Called when tag is detected
   * @param options - Scan options
   */
  startScan(callback: (tag: NfcTag) => void, options?: NfcScanOptions): () => void

  /**
   * Scan for a single tag
   * @param options - Scan options
   */
  scanOnce(options?: NfcScanOptions): Promise<NfcTag>

  /**
   * Write NDEF message to tag
   * @param message - Message to write
   * @param options - Write options
   */
  write(message: NdefMessage, options?: NfcWriteOptions): Promise<void>

  /**
   * Erase tag (write empty NDEF)
   */
  erase(): Promise<void>

  /**
   * Make tag read-only
   */
  makeReadOnly(): Promise<void>

  /**
   * Check if NFC is available and enabled
   */
  isAvailable(): Promise<boolean>

  /**
   * Check if NFC is enabled
   */
  isEnabled(): Promise<boolean>

  /**
   * Open NFC settings
   */
  openSettings(): Promise<void>

  /**
   * Get the current NFC permission status.
   * @returns The permission status: 'granted', 'denied', 'prompt', 'disabled', or 'unsupported'.
   */
  getPermissionStatus(): Promise<NfcPermissionStatus>

  /**
   * Request NFC permission from the user.
   * @returns The resulting permission status after the request.
   */
  requestPermission(): Promise<NfcPermissionStatus>

  /**
   * Get the platform's NFC capabilities.
   * @returns The capabilities indicating NFC support, read/write ability, and supported tag types.
   */
  getCapabilities(): Promise<NfcCapabilities>
}
