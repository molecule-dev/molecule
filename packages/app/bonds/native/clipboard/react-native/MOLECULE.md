# @molecule/app-clipboard-react-native

React Native clipboard provider for molecule.dev.

Uses `@react-native-clipboard/clipboard` to implement the ClipboardProvider interface
from `@molecule/app-clipboard`.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-clipboard'
import { provider } from '@molecule/app-clipboard-react-native'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-clipboard-react-native @molecule/app-clipboard @molecule/app-i18n @molecule/app-logger @react-native-clipboard/clipboard
```

## API

### Interfaces

#### `ReactNativeClipboardConfig`

Configuration for the React Native clipboard provider.

```typescript
interface ReactNativeClipboardConfig {
  /**
   * Whether to poll for clipboard changes (text-diff polling, works on all platforms). Without it, onChange() returns a no-op unsubscribe.
   * @default false
   */
  pollForChanges?: boolean

  /**
   * Polling interval in milliseconds (if pollForChanges is true).
   * @default 1000
   */
  pollInterval?: number
}
```

### Functions

#### `createReactNativeClipboardProvider(config)`

Creates a React Native clipboard provider backed by `@react-native-clipboard/clipboard`.

```typescript
function createReactNativeClipboardProvider(config?: ReactNativeClipboardConfig): ClipboardProvider
```

- `config` — Optional provider configuration.

**Returns:** A ClipboardProvider implementation for React Native.

### Constants

#### `provider`

Default React Native clipboard provider.

```typescript
const provider: ClipboardProvider
```

## Core Interface
Implements `@molecule/app-clipboard` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-clipboard'
import { provider } from '@molecule/app-clipboard-react-native'

export function setupNativeClipboardReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-clipboard` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@react-native-clipboard/clipboard` >=1.13.0

### Runtime Dependencies

- `@molecule/app-clipboard`
- `@molecule/app-i18n`
- `@molecule/app-logger`
- `@react-native-clipboard/clipboard`

Platform limits of the underlying `@react-native-clipboard/clipboard`
(installed separately; the first clipboard call throws an actionable
error naming it if missing):
- HTML is NOT supported: `writeHtml()`/`write({ html })` write the markup
  as PLAIN TEXT, and `readHtml()` always resolves `null`.
- Images: `writeImage()`/`readImage()` work only where the native module
  supports them (iOS) and only with base64 strings — elsewhere (Android,
  Blob input) they silently no-op / return null. Check
  `getCapabilities().canWriteImage` before showing a copy-image action.
- `onChange()` fires only with `createReactNativeClipboardProvider({
  pollForChanges: true })` — the bare `provider` export has it OFF and
  returns a no-op unsubscribe.

## Translations

Translation strings are provided by `@molecule/app-locales-clipboard`.
