# @molecule/app-feature-barcode-scanner-react

Browser barcode scanner React component.

Acquires a rear-facing camera via `getUserMedia({ video: { facingMode: 'environment' } })`
and decodes frames using the W3C `BarcodeDetector` API where
available (Chromium / WebView), falling back to `@zxing/library` for
Safari / Firefox. Designed for warehouse-fulfillment, inventory-
management, and grocery-delivery flagship apps.

Exports `<BarcodeScanner>`, the `BarcodeFormat` / `BarcodeScanResult`
/ `BarcodeScannerError` shapes, the `DEFAULT_FORMATS` constant, and
the `__setBarcodeDetectorOverride` / `__setZxingLoaderOverride`
test injection points.

## Quick Start

```tsx
import { BarcodeScanner } from '@molecule/app-feature-barcode-scanner-react'

function ScanPanel() {
  return (
    <BarcodeScanner
      formats={['ean_13', 'upc_a']}
      onScan={({ format, value }) => addLineItem(value)}
      onError={(err) => showToast(err.message)}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-barcode-scanner-react @molecule/app-react @molecule/app-ui @zxing/library react
npm install -D @types/react
```

## API

### Interfaces

#### `BarcodeScannerError`

Error shape passed to `onError`.

```typescript
interface BarcodeScannerError {
  /** Stable machine-readable error code. */
  code: BarcodeScannerErrorCode
  /** Localized human-readable message. */
  message: string
  /** Original underlying error, if any. */
  cause?: unknown
}
```

#### `BarcodeScannerProps`

Props for `<BarcodeScanner>`.

```typescript
interface BarcodeScannerProps {
  /**
   * Symbologies the scanner should accept. Defaults to the four most
   * common retail / logistics codes:
   * `['ean_13', 'upc_a', 'code_128', 'qr_code']`.
   */
  formats?: BarcodeFormat[]
  /** Fired with the decoded result on every successful scan. */
  onScan: (result: BarcodeScanResult) => void
  /** Fired when camera acquisition or detection fails. */
  onError?: (error: BarcodeScannerError) => void
  /**
   * When `true`, keeps scanning after each detection (deduped on the
   * decoded value). When `false` (default), stops the camera and the
   * detection loop on the first successful scan.
   */
  continuous?: boolean
  /**
   * Polling interval, in milliseconds, between detector frames.
   * Defaults to `200`. Lower values increase responsiveness at higher
   * CPU cost.
   */
  scanIntervalMs?: number
  /** Pixel width hint passed as the camera constraint. Defaults to 640. */
  width?: number
  /** Pixel height hint passed as the camera constraint. Defaults to 480. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `BarcodeScanResult`

Result emitted from a successful scan.

```typescript
interface BarcodeScanResult {
  /** Format of the detected symbology (e.g. `'ean_13'`). */
  format: BarcodeFormat | string
  /** Raw decoded value as produced by the underlying detector. */
  value: string
}
```

#### `ZxingReader`

Minimal subset of `BrowserMultiFormatReader` we depend on.

```typescript
interface ZxingReader {
  /**
   * Decode a single frame from a `<video>` element. Returns
   * `{ text, format }` when a barcode is detected, otherwise `null` or
   * throws a `NotFoundException` (caller treats both as "no match").
   */
  decodeOnceFromVideoElement(video: HTMLVideoElement): Promise<{ text: string; format?: string }>
  /** Stop any internal scanning loop and release decoders. */
  reset(): void
}
```

### Types

#### `BarcodeFormat`

Supported barcode/symbology formats. Mirrors the W3C Shape Detection
`BarcodeFormat` enum so values can be passed straight through to the
native `BarcodeDetector` constructor when present. The
`@zxing/library` fallback ignores this list and decodes all symbologies.

```typescript
type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_8'
  | 'ean_13'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e'
```

#### `BarcodeScannerErrorCode`

Reasons the scanner can fail at runtime — surfaced via `onError` and
via i18n-keyed status messages on the rendered overlay.

```typescript
type BarcodeScannerErrorCode =
  /** `getUserMedia()` rejected with `NotAllowedError` or `SecurityError`. */
  | 'permission_denied'
  /** `getUserMedia()` rejected with `NotFoundError` (no camera attached). */
  | 'no_camera'
  /** Browser does not expose `navigator.mediaDevices.getUserMedia`. */
  | 'unsupported'
  /** A detector instance threw while decoding a frame. */
  | 'detector_failure'
  /** The fallback `@zxing/library` import failed (offline / blocked). */
  | 'fallback_unavailable'
```

#### `ZxingLoader`

Loader function returning a `@zxing/library`-compatible reader.
Indirection lets us pin to a small subset of the surface area we
actually depend on and lets tests stub the fallback path.

```typescript
type ZxingLoader = () => Promise<ZxingReader>
```

### Functions

#### `__setBarcodeDetectorOverride(ctor)`

Override the `BarcodeDetector` constructor used by the next mounted
scanner. Pass `null` to force the fallback path even when the
native API is present. Pass `undefined` to revert to the browser
default.

```typescript
function __setBarcodeDetectorOverride(ctor: BarcodeDetectorConstructor | null | undefined): void
```

- `ctor` — Constructor stub or `null`/`undefined`.

#### `__setZxingLoaderOverride(loader)`

Override the `@zxing/library` loader used by the next mounted
scanner. Pass `null` to force the loader to fail (simulating an
offline bundle). Pass `undefined` to revert to the real dynamic
import.

```typescript
function __setZxingLoaderOverride(loader: ZxingLoader | null | undefined): void
```

- `loader` — Loader stub or `null`/`undefined`.

#### `BarcodeScanner(props)`

Browser-side barcode scanner. Acquires a rear-facing camera via
`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`,
then drives a detection loop using the native `BarcodeDetector` API
when available and falling back to `@zxing/library` otherwise.

The component is purely presentational on top of the camera stream
— it renders a `<video>` plus a small status overlay routed through
the companion locale bond and `getClassMap()`. Detected results are
delivered to the caller through `onScan`; failures through
`onError`. The camera stream and detection loop are torn down on
unmount and on every prop change that affects acquisition.

```typescript
function BarcodeScanner(props: BarcodeScannerProps): JSX.Element
```

- `props` — Component props.

**Returns:** The scanner element.

### Constants

#### `DEFAULT_FORMATS`

Default formats accepted when the caller doesn't pass `formats`.

```typescript
const DEFAULT_FORMATS: BarcodeFormat[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@zxing/library`
- `react`

Camera access requires a SECURE CONTEXT — HTTPS or `localhost` — and a
user permission grant. On plain http (or when the user denies), the
component stays on its localized error overlay and fires `onError`
with `'unsupported'` / `'permission_denied'`; there is nothing to
retry until the context or permission changes.

The `formats` prop constrains only the native `BarcodeDetector` path.
The `@zxing/library` fallback (Safari / Firefox) decodes ALL
symbologies regardless of `formats`, and reports `format: 'unknown'`
in its results — filter on `result.value` shape if the symbology
matters cross-browser.

Consecutive identical values are deduped: the same barcode will not
fire `onScan` twice in a row, even with `continuous`. Remount the
component (e.g. via a React `key`) to re-arm scanning for a value
that was already delivered.

All user-visible text routes through the companion locale bond
`@molecule/app-locales-feature-barcode-scanner`. Styling
routes through `getClassMap()` from `@molecule/app-ui` — no
Tailwind utility class names appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-barcode-scanner`.
