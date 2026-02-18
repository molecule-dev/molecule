# @molecule/app-clipboard

Clipboard access interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-clipboard
```

## API

### Interfaces

#### `ClipboardCapabilities`

Clipboard capabilities

```typescript
interface ClipboardCapabilities {
  /** Whether clipboard access is supported */
  supported: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether image reading is supported */
  canReadImage: boolean
  /** Whether image writing is supported */
  canWriteImage: boolean
  /** Whether HTML is supported */
  canReadHtml: boolean
  /** Available data types */
  availableTypes?: ClipboardDataType[]
}
```

#### `ClipboardChangeEvent`

Clipboard change event

```typescript
interface ClipboardChangeEvent {
  /** Whether clipboard has content */
  hasContent: boolean
  /** Available content types */
  types: ClipboardDataType[]
}
```

#### `ClipboardContent`

Clipboard content

```typescript
interface ClipboardContent {
  /** Plain text content */
  text?: string
  /** HTML content */
  html?: string
  /** Image as base64 data URL or blob */
  image?: string | Blob
  /** URL content */
  url?: string
  /** Raw data with MIME type */
  data?: {
    type: ClipboardDataType
    value: string | Blob | ArrayBuffer
  }
}
```

#### `ClipboardProvider`

Clipboard provider interface

```typescript
interface ClipboardProvider {
  /**
   * Write content to clipboard
   * @param content - Content to write
   * @param options - Write options
   */
  write(content: ClipboardContent, options?: WriteOptions): Promise<void>

  /**
   * Write plain text to clipboard
   * @param text - Text to write
   */
  writeText(text: string): Promise<void>

  /**
   * Write HTML to clipboard
   * @param html - HTML to write
   * @param fallbackText - Plain text fallback
   */
  writeHtml(html: string, fallbackText?: string): Promise<void>

  /**
   * Write image to clipboard
   * @param image - Image as base64 data URL or Blob
   */
  writeImage(image: string | Blob): Promise<void>

  /**
   * Read content from clipboard
   * @param options - Read options
   */
  read(options?: ReadOptions): Promise<ClipboardContent>

  /**
   * Read plain text from clipboard
   */
  readText(): Promise<string>

  /**
   * Read HTML from clipboard
   */
  readHtml(): Promise<string | null>

  /**
   * Read image from clipboard
   */
  readImage(): Promise<string | null>

  /**
   * Clear the clipboard
   */
  clear(): Promise<void>

  /**
   * Check if clipboard has content
   * @returns Whether the clipboard currently has content.
   */
  hasContent(): Promise<boolean>

  /**
   * Get available content types in clipboard
   * @returns The list of MIME types available in the clipboard.
   */
  getAvailableTypes(): Promise<ClipboardDataType[]>

  /**
   * Get clipboard capabilities
   * @returns The clipboard capabilities indicating supported operations.
   */
  getCapabilities(): Promise<ClipboardCapabilities>

  /**
   * Listen for clipboard changes (if supported)
   * @param callback - Called when clipboard content changes
   * @returns Unsubscribe function
   */
  onChange?(callback: (event: ClipboardChangeEvent) => void): () => void
}
```

#### `ReadOptions`

Options for reading from the clipboard (preferred MIME types in priority order).

```typescript
interface ReadOptions {
  /** Preferred data types to read (in order of preference) */
  preferredTypes?: ClipboardDataType[]
}
```

#### `WriteOptions`

Options for writing to the clipboard (label, confirmation toast).

```typescript
interface WriteOptions {
  /** Label for the content (used by some platforms) */
  label?: string
  /** Whether to show a confirmation (if platform supports) */
  showConfirmation?: boolean
}
```

### Types

#### `ClipboardDataType`

Clipboard data types

```typescript
type ClipboardDataType = 'text/plain' | 'text/html' | 'image/png' | 'image/jpeg' | string
```

### Functions

#### `clear()`

Clear the clipboard

```typescript
function clear(): Promise<void>
```

**Returns:** A promise that resolves when the clipboard is cleared.

#### `copyTextWithFallback(text)`

Copy text to the clipboard with a browser fallback. Uses the native provider if
available, otherwise falls back to the deprecated `document.execCommand('copy')`.

```typescript
function copyTextWithFallback(text: string): Promise<boolean>
```

- `text` — The text to copy to the clipboard.

**Returns:** Whether the text was successfully copied.

#### `getAvailableTypes()`

Get available content types in clipboard

```typescript
function getAvailableTypes(): Promise<string[]>
```

**Returns:** The list of MIME types available in the clipboard.

#### `getCapabilities()`

Get clipboard capabilities

```typescript
function getCapabilities(): Promise<ClipboardCapabilities>
```

**Returns:** The clipboard capabilities indicating supported operations.

#### `getProvider()`

Get the current clipboard provider

```typescript
function getProvider(): ClipboardProvider
```

**Returns:** The active clipboard provider instance.

#### `hasContent()`

Check if clipboard has content

```typescript
function hasContent(): Promise<boolean>
```

**Returns:** Whether the clipboard currently has content.

#### `hasProvider()`

Check if a clipboard provider is set

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a clipboard provider has been bonded.

#### `isTextInClipboard(text)`

Check if the given text matches the current clipboard content.

```typescript
function isTextInClipboard(text: string): Promise<boolean>
```

- `text` — The text to compare against the clipboard.

**Returns:** Whether the clipboard contains the exact same text.

#### `onChange(callback)`

Listen for clipboard changes (if supported)

```typescript
function onChange(callback: (event: ClipboardChangeEvent) => void): () => void
```

- `callback` — Called when clipboard content changes

**Returns:** Unsubscribe function to stop listening for changes.

#### `read(options)`

Read content from clipboard

```typescript
function read(options?: ReadOptions): Promise<ClipboardContent>
```

- `options` — Read options

**Returns:** The clipboard content including text, HTML, image, or raw data.

#### `readHtml()`

Read HTML from clipboard

```typescript
function readHtml(): Promise<string | null>
```

**Returns:** The HTML string from the clipboard, or null if unavailable.

#### `readImage()`

Read image from clipboard

```typescript
function readImage(): Promise<string | null>
```

**Returns:** The image as a base64 data URL, or null if unavailable.

#### `readText()`

Read plain text from clipboard

```typescript
function readText(): Promise<string>
```

**Returns:** The plain text string from the clipboard.

#### `setProvider(provider)`

Set the clipboard provider

```typescript
function setProvider(provider: ClipboardProvider): void
```

- `provider` — ClipboardProvider implementation

#### `write(content, options)`

Write content to clipboard

```typescript
function write(content: ClipboardContent, options?: WriteOptions): Promise<void>
```

- `content` — Content to write
- `options` — Write options

**Returns:** A promise that resolves when the content is written.

#### `writeHtml(html, fallbackText)`

Write HTML to clipboard

```typescript
function writeHtml(html: string, fallbackText?: string): Promise<void>
```

- `html` — HTML to write
- `fallbackText` — Plain text fallback

**Returns:** A promise that resolves when the HTML is written.

#### `writeImage(image)`

Write image to clipboard

```typescript
function writeImage(image: string | Blob): Promise<void>
```

- `image` — Image as base64 data URL or Blob

**Returns:** A promise that resolves when the image is written.

#### `writeText(text)`

Write plain text to clipboard

```typescript
function writeText(text: string): Promise<void>
```

- `text` — Text to write

**Returns:** A promise that resolves when the text is written.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-clipboard`.
