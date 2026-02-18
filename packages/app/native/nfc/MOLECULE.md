# @molecule/app-nfc

NFC capabilities interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-nfc
```

## API

### Interfaces

#### `NdefMessage`

NDEF message (collection of records)

```typescript
interface NdefMessage {
  /** NDEF records */
  records: NdefRecord[]
}
```

#### `NdefRecord`

An NFC Data Exchange Format record (type, payload, optional language code and MIME type).

```typescript
interface NdefRecord {
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
```

#### `NfcCapabilities`

NFC capabilities

```typescript
interface NfcCapabilities {
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
```

#### `NfcProvider`

NFC provider interface

```typescript
interface NfcProvider {
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
```

#### `NfcScanOptions`

NFC scan options

```typescript
interface NfcScanOptions {
  /** Keep scanning after first tag */
  keepSessionAlive?: boolean
  /** Alert message (iOS) */
  alertMessage?: string
  /** Scan timeout in ms (0 = no timeout) */
  timeout?: number
}
```

#### `NfcTag`

Detected NFC tag with its ID, technology types, size, writability, and NDEF message.

```typescript
interface NfcTag {
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
```

#### `NfcWriteOptions`

NFC write options

```typescript
interface NfcWriteOptions {
  /** Make tag read-only after write */
  makeReadOnly?: boolean
  /** Alert message (iOS) */
  alertMessage?: string
}
```

### Types

#### `NdefRecordType`

NDEF record types

```typescript
type NdefRecordType =
  | 'text' // Plain text
  | 'uri' // URI/URL
  | 'mime' // MIME type data
  | 'external' // External type
  | 'empty' // Empty record
  | 'unknown'
```

#### `NfcPermissionStatus`

NFC permission status

```typescript
type NfcPermissionStatus = 'granted' | 'denied' | 'prompt' | 'disabled' | 'unsupported'
```

### Functions

#### `createExternalRecord(domain, type, payload)`

Create an NDEF external record for application-specific data.

```typescript
function createExternalRecord(domain: string, type: string, payload: string): NdefRecord
```

- `domain` — The reverse domain name (e.g., 'com.example').
- `type` — The application-specific type name.
- `payload` — The data payload.

**Returns:** An NdefRecord of type 'external' with recordType set to 'domain:type'.

#### `createMessage(records)`

Create an NDEF message from one or more records.

```typescript
function createMessage(records?: NdefRecord[]): NdefMessage
```

- `records` — The NDEF records to include in the message.

**Returns:** An NdefMessage containing the provided records.

#### `createMimeRecord(mimeType, payload)`

Create an NDEF MIME record for arbitrary typed data.

```typescript
function createMimeRecord(mimeType: string, payload: string): NdefRecord
```

- `mimeType` — The MIME type (e.g., 'application/json', 'image/png').
- `payload` — The data as a string (base64 for binary data).

**Returns:** An NdefRecord of type 'mime'.

#### `createTextRecord(text, languageCode)`

Create an NDEF text record with the given content and language code.

```typescript
function createTextRecord(text: string, languageCode?: string): NdefRecord
```

- `text` — The text content for the record.
- `languageCode` — BCP 47 language code (default: 'en').

**Returns:** An NdefRecord of type 'text'.

#### `createUriRecord(uri)`

Create an NDEF URI record for a URL or other URI.

```typescript
function createUriRecord(uri: string): NdefRecord
```

- `uri` — The URI or URL to encode.

**Returns:** An NdefRecord of type 'uri'.

#### `erase()`

Erase the NFC tag by writing an empty NDEF message.

```typescript
function erase(): Promise<void>
```

**Returns:** A promise that resolves when the tag is erased.

#### `formatTagId(id)`

Format an NFC tag ID as a colon-separated uppercase hex string (e.g., '04:A2:B3:C4').
If the ID is already hex digits, inserts colons between byte pairs.

```typescript
function formatTagId(id: string): string
```

- `id` — The raw tag ID string.

**Returns:** The formatted tag ID.

#### `getCapabilities()`

Get the platform's NFC capabilities.

```typescript
function getCapabilities(): Promise<NfcCapabilities>
```

**Returns:** The capabilities indicating NFC support, read/write ability, and supported tag types.

#### `getPermissionStatus()`

Get the current NFC permission status.

```typescript
function getPermissionStatus(): Promise<NfcPermissionStatus>
```

**Returns:** The permission status: 'granted', 'denied', 'prompt', 'disabled', or 'unsupported'.

#### `getProvider()`

Get the current NFC provider.

```typescript
function getProvider(): NfcProvider
```

**Returns:** The active NfcProvider instance.

#### `getText(message)`

Extract the text payload from the first text record in an NDEF message.

```typescript
function getText(message: NdefMessage): string | null
```

- `message` — The NDEF message to search.

**Returns:** The text content, or null if no text record exists.

#### `getTextRecords(message)`

Get all text records from an NDEF message.

```typescript
function getTextRecords(message: NdefMessage): NdefRecord[]
```

- `message` — The NDEF message to filter.

**Returns:** Array of NdefRecords with type 'text'.

#### `getUri(message)`

Extract the URI payload from the first URI record in an NDEF message.

```typescript
function getUri(message: NdefMessage): string | null
```

- `message` — The NDEF message to search.

**Returns:** The URI string, or null if no URI record exists.

#### `getUriRecords(message)`

Get all URI records from an NDEF message.

```typescript
function getUriRecords(message: NdefMessage): NdefRecord[]
```

- `message` — The NDEF message to filter.

**Returns:** Array of NdefRecords with type 'uri'.

#### `hasProvider()`

Check if an NFC provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether an NfcProvider has been set.

#### `isAvailable()`

Check if NFC hardware is present and enabled on the device.
Returns false without throwing if no provider is set.

```typescript
function isAvailable(): Promise<boolean>
```

**Returns:** Whether NFC is available and enabled.

#### `isDeepLink(uri)`

Check if a URI is a deep link (custom scheme) rather than an HTTP/HTTPS URL.

```typescript
function isDeepLink(uri: string): boolean
```

- `uri` — The URI to check.

**Returns:** Whether the URI uses a custom scheme (not http:// or https://).

#### `isEnabled()`

Check if NFC is enabled in the device settings.

```typescript
function isEnabled(): Promise<boolean>
```

**Returns:** Whether NFC is currently enabled.

#### `makeReadOnly()`

Make the NFC tag permanently read-only. This operation is irreversible.

```typescript
function makeReadOnly(): Promise<void>
```

**Returns:** A promise that resolves when the tag is made read-only.

#### `openSettings()`

Open the device's NFC settings screen so the user can enable NFC.

```typescript
function openSettings(): Promise<void>
```

**Returns:** A promise that resolves when the settings screen is opened.

#### `requestPermission()`

Request NFC permission from the user.

```typescript
function requestPermission(): Promise<NfcPermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `scanOnce(options)`

Scan for a single NFC tag and return its data.

```typescript
function scanOnce(options?: NfcScanOptions): Promise<NfcTag>
```

- `options` — Scan configuration (alert message, timeout).

**Returns:** The detected NFC tag.

#### `setProvider(provider)`

Set the NFC provider.

```typescript
function setProvider(provider: NfcProvider): void
```

- `provider` — NfcProvider implementation to register.

#### `startScan(callback, options)`

Start scanning for NFC tags. The callback fires each time a tag is detected.

```typescript
function startScan(callback: (tag: NfcTag) => void, options?: NfcScanOptions): () => void
```

- `callback` — Called with the detected NfcTag data.
- `options` — Scan configuration (keep-alive, alert message, timeout).

**Returns:** A function that stops the NFC scan when called.

#### `write(message, options)`

Write an NDEF message to the next detected NFC tag.

```typescript
function write(message: NdefMessage, options?: NfcWriteOptions): Promise<void>
```

- `message` — The NDEF message containing records to write.
- `options` — Write configuration (make read-only, alert message).

**Returns:** A promise that resolves when the message is written to the tag.

#### `writeText(text)`

Write a plain text string to an NFC tag. Creates a text record and writes it.

```typescript
function writeText(text: string): Promise<void>
```

- `text` — The text content to write to the tag.

**Returns:** A promise that resolves when the text is written to the tag.

#### `writeUrl(url)`

Write a URL to an NFC tag. Creates a URI record and writes it.

```typescript
function writeUrl(url: string): Promise<void>
```

- `url` — The URL to write to the tag.

**Returns:** A promise that resolves when the URL is written to the tag.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-nfc`.
