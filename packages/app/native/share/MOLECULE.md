# @molecule/app-share

Native share sheet interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-share
```

## API

### Interfaces

#### `ShareCapabilities`

Share capabilities

```typescript
interface ShareCapabilities {
  /** Whether sharing is supported */
  supported: boolean
  /** Whether file sharing is supported */
  fileSharing: boolean
  /** Whether multiple files can be shared */
  multipleFiles: boolean
  /** Supported MIME types (if available) */
  supportedMimeTypes?: string[]
}
```

#### `ShareContent`

Share content options

```typescript
interface ShareContent {
  /** Title of the shared content */
  title?: string
  /** Text content to share */
  text?: string
  /** URL to share */
  url?: string
  /** Dialog title (Android only) */
  dialogTitle?: string
}
```

#### `ShareFile`

A file attachment for sharing, with path/URI, MIME type, and display name.

```typescript
interface ShareFile {
  /** File path or URI */
  path: string
  /** MIME type of the file */
  mimeType?: string
  /** Display name for the file */
  name?: string
}
```

#### `ShareOptions`

Share options including files

```typescript
interface ShareOptions extends ShareContent {
  /** Files to share */
  files?: ShareFile[]
}
```

#### `ShareProvider`

Share provider interface

```typescript
interface ShareProvider {
  /**
   * Share content using the native share sheet.
   * @param options - Content, files, and dialog configuration to share.
   * @returns The share result indicating completion status and activity type.
   */
  share(options: ShareOptions): Promise<ShareResult>

  /**
   * Share text content via the native share sheet.
   * @param text - The text content to share.
   * @param title - Optional title for the share dialog.
   * @returns The share result indicating completion status and activity type.
   */
  shareText(text: string, title?: string): Promise<ShareResult>

  /**
   * Share a URL via the native share sheet.
   * @param url - The URL to share.
   * @param title - Optional title for the share dialog.
   * @returns The share result indicating completion status and activity type.
   */
  shareUrl(url: string, title?: string): Promise<ShareResult>

  /**
   * Share one or more files via the native share sheet.
   * @param files - The files to share, with paths and optional MIME types.
   * @param options - Additional share content (title, text, URL) to include.
   * @returns The share result indicating completion status and activity type.
   */
  shareFiles(files: ShareFile[], options?: ShareContent): Promise<ShareResult>

  /**
   * Check if the native share sheet is available on this platform.
   * @returns Whether sharing is supported.
   */
  canShare(): Promise<boolean>

  /**
   * Check if the given content (text, URL, files) can be shared on this platform.
   * @param options - The share options to validate.
   * @returns Whether the specified content can be shared.
   */
  canShareContent(options: ShareOptions): Promise<boolean>

  /**
   * Get the platform's sharing capabilities.
   * @returns The capabilities indicating file sharing support and allowed MIME types.
   */
  getCapabilities(): Promise<ShareCapabilities>
}
```

#### `ShareResult`

Result of a share operation: completion status, chosen activity/app, and any error.

```typescript
interface ShareResult {
  /** Whether sharing was completed successfully */
  completed: boolean
  /** Activity type that was used (iOS) or package name (Android) */
  activityType?: string
  /** Error message if sharing failed */
  error?: string
}
```

### Functions

#### `canShare()`

Check if the native share sheet is available on this platform.
Returns false without throwing if no provider is set.

```typescript
function canShare(): Promise<boolean>
```

**Returns:** Whether sharing is supported.

#### `canShareContent(options)`

Check if the given content can be shared on this platform.
Returns false without throwing if no provider is set.

```typescript
function canShareContent(options: ShareOptions): Promise<boolean>
```

- `options` — The share options to validate.

**Returns:** Whether the specified content can be shared.

#### `getCapabilities()`

Get the platform's sharing capabilities.

```typescript
function getCapabilities(): Promise<ShareCapabilities>
```

**Returns:** The capabilities indicating file sharing support and allowed MIME types.

#### `getMimeType(filename)`

Infer a MIME type from a file extension. Supports common image, document,
text, media, and archive formats. Falls back to 'application/octet-stream'.

```typescript
function getMimeType(filename: string): string
```

- `filename` — The filename or path to extract the extension from.

**Returns:** The inferred MIME type string.

#### `getProvider()`

Get the current share provider.

```typescript
function getProvider(): ShareProvider
```

**Returns:** The active ShareProvider instance.

#### `hasProvider()`

Check if a share provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a ShareProvider has been bonded.

#### `setProvider(provider)`

Set the share provider.

```typescript
function setProvider(provider: ShareProvider): void
```

- `provider` — ShareProvider implementation to register.

#### `share(options)`

Share content using the native share sheet.

```typescript
function share(options: ShareOptions): Promise<ShareResult>
```

- `options` — Content, files, and dialog configuration to share.

**Returns:** The share result indicating completion status and activity type.

#### `shareFiles(files, options)`

Share one or more files via the native share sheet.

```typescript
function shareFiles(files: ShareFile[], options?: ShareContent): Promise<ShareResult>
```

- `files` — The files to share, with paths and optional MIME types.
- `options` — Additional share content (title, text, URL) to include.

**Returns:** The share result indicating completion status and activity type.

#### `shareText(text, title)`

Share text content via the native share sheet.

```typescript
function shareText(text: string, title?: string): Promise<ShareResult>
```

- `text` — The text content to share.
- `title` — Optional title for the share dialog.

**Returns:** The share result indicating completion status and activity type.

#### `shareUrl(url, title)`

Share a URL via the native share sheet.

```typescript
function shareUrl(url: string, title?: string): Promise<ShareResult>
```

- `url` — The URL to share.
- `title` — Optional title for the share dialog.

**Returns:** The share result indicating completion status and activity type.

### Constants

#### `socialUrls`

Pre-built social media share URL generators. Each method returns a URL that
opens the platform's share dialog with the provided content pre-filled.

```typescript
const socialUrls: { readonly twitter: (text: string, url?: string) => string; readonly facebook: (url: string) => string; readonly linkedin: (url: string) => string; readonly whatsapp: (text: string) => string; readonly telegram: (url: string, text?: string) => string; readonly email: (subject: string, body: string) => string; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-share`.
