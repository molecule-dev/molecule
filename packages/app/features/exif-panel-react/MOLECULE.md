# @molecule/app-exif-panel-react

EXIF metadata panel for photo-sharing apps.

Exports `<ExifPanel>` — a structured renderer for already-parsed EXIF
data (camera, lens, aperture, shutter, ISO, focal length, GPS,
timestamp, software, copyright). The caller is responsible for
decoding the raw EXIF payload (e.g. via the `exifr` library); this
package is a styling-agnostic, i18n-aware renderer only.

Also exports the `ExifData` and `ExifPanelProps` types and the pure
formatting helpers (`formatAperture`, `formatShutter`, `formatIso`,
`formatFocalLength`, `formatGps`, `formatTimestamp`, `formatCamera`,
`buildMapLink`, `formatDms`).

## Quick Start

```tsx
import { ExifPanel } from '@molecule/app-exif-panel-react'

function PhotoMetadata({ exif }) {
  return <ExifPanel exif={exif} showGps compact={false} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-exif-panel-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ExifData`

Parsed EXIF metadata. Every field is optional — extra fields are
permitted (the renderer ignores them) so callers can pass through the
full output of their EXIF parser without filtering.

```typescript
interface ExifData {
  /** Camera manufacturer (e.g. `"Canon"`, `"Sony"`, `"Apple"`). */
  make?: string
  /** Camera model (e.g. `"EOS R5"`, `"a7 III"`, `"iPhone 15 Pro"`). */
  model?: string
  /** Lens model description (e.g. `"RF 24-70mm F2.8 L IS USM"`). */
  lensModel?: string
  /** Aperture as an f-number (the `N` in `f/N`). */
  fNumber?: number
  /** Exposure / shutter time in seconds (e.g. `0.008` ≈ `1/125 s`). */
  exposureTime?: number
  /** ISO sensitivity (e.g. `100`, `1600`). */
  iso?: number
  /** Focal length in millimetres. */
  focalLength?: number
  /** 35 mm-equivalent focal length, when supplied by the camera. */
  focalLength35mm?: number
  /** Capture timestamp — `Date`, ISO 8601 string, or epoch millis. */
  dateTimeOriginal?: Date | string | number
  /** GPS latitude in signed decimal degrees. */
  gpsLatitude?: number
  /** GPS longitude in signed decimal degrees. */
  gpsLongitude?: number
  /** EXIF orientation tag (1–8). */
  orientation?: number
  /** Software / firmware that produced the file. */
  software?: string
  /** Copyright statement embedded in the file. */
  copyright?: string
  /** Pass-through for parser-specific extras the renderer ignores. */
  [key: string]: unknown
}
```

#### `ExifPanelProps`

Props for the `<ExifPanel>` component.

```typescript
interface ExifPanelProps {
  /** Parsed EXIF metadata. */
  exif: ExifData
  /**
   * Compact mode collapses the panel into a single condensed grid with
   * smaller type and tighter spacing. Defaults to `false`.
   */
  compact?: boolean
  /**
   * Whether to render the GPS coordinates row when latitude / longitude
   * are present. Defaults to `true`.
   */
  showGps?: boolean
  /** Optional heading override. */
  heading?: string
  /** Extra classes appended to the panel root. */
  className?: string
}
```

### Functions

#### `buildMapLink(latitude, longitude)`

Build an OpenStreetMap link URL for a GPS coordinate pair.

```typescript
function buildMapLink(latitude: number | undefined, longitude: number | undefined): string | null
```

- `latitude` — Latitude in signed decimal degrees.
- `longitude` — Longitude in signed decimal degrees.

**Returns:** An `https://www.openstreetmap.org/?...` URL, or `null` when
 *   either input is missing.

#### `ExifPanel(props)`

Render parsed EXIF metadata as a structured panel — camera, lens,
exposure (aperture + shutter + ISO + focal length), GPS (with optional
map link), and capture timestamp.

The component is purely presentational: callers parse the binary EXIF
payload elsewhere (e.g. via the `exifr` library) and pass the
normalized {@link ExifPanelProps.exif} object in. Empty / undefined
fields are silently skipped.

All styling resolves through `getClassMap()` and all user-facing text
resolves through `useTranslation()` — no hardcoded UI strings or
styling-library class names.

```typescript
function ExifPanel(props: ExifPanelProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — {@link ExifPanelProps}.

**Returns:** The rendered panel element.

#### `formatAperture(fNumber)`

Format an aperture f-number as `f/N` with one decimal place dropped
when whole.

```typescript
function formatAperture(fNumber: number | undefined): string | null
```

- `fNumber` — The aperture value (e.g. `2.8`, `5.6`, `8`).

**Returns:** A display string like `"f/2.8"` or `"f/8"`, or `null` when
 *   the input is missing / invalid.

#### `formatCamera(make, model)`

Compose camera make + model into a single `"Make Model"` string,
collapsing duplication when the model already starts with the make
(Sony often does this).

```typescript
function formatCamera(make: string | undefined, model: string | undefined): string | null
```

- `make` — Camera manufacturer.
- `model` — Camera model.

**Returns:** The combined label, or `null` when both inputs are missing.

#### `formatDms(value, axis)`

Format a single GPS coordinate (latitude or longitude) as
deg/min/sec with a hemisphere suffix.

```typescript
function formatDms(value: number | undefined, axis: "lat" | "lon"): string | null
```

- `value` — Signed decimal degrees.
- `axis` — Which axis the value represents — picks `N`/`S` vs `E`/`W`.

**Returns:** A string like `"37° 25' 19.07" N"`, or `null` when missing.

#### `formatFocalLength(mm)`

Format a focal length value as `N mm`.

```typescript
function formatFocalLength(mm: number | undefined): string | null
```

- `mm` — Focal length in millimetres.

**Returns:** A display string like `"50 mm"`, or `null` when missing.

#### `formatGps(latitude, longitude)`

Format a GPS coordinate pair as a single deg/min/sec string.

```typescript
function formatGps(latitude: number | undefined, longitude: number | undefined): string | null
```

- `latitude` — Latitude in signed decimal degrees.
- `longitude` — Longitude in signed decimal degrees.

**Returns:** A combined string like `"37° 25' 19.07" N, 122° 5' 4.16" W"`,
 *   or `null` if either value is missing.

#### `formatIso(iso)`

Format an ISO sensitivity as `ISO N`.

```typescript
function formatIso(iso: number | undefined): string | null
```

- `iso` — The ISO value (e.g. `100`, `1600`).

**Returns:** A display string like `"ISO 1600"`, or `null` when missing.

#### `formatShutter(seconds)`

Format a shutter / exposure time in seconds as a human-readable
string. Sub-second times are rendered as a `1/x s` reciprocal with
the denominator rounded; longer exposures stay in seconds.

```typescript
function formatShutter(seconds: number | undefined): string | null
```

- `seconds` — Exposure time in seconds.

**Returns:** A display string like `"1/125 s"` or `"2 s"`, or `null` when
 *   the input is missing / invalid.

#### `formatTimestamp(value)`

Format an EXIF capture timestamp. Accepts `Date`, ISO string, or
epoch milliseconds and renders via `toLocaleString` so the result
respects the host environment's locale and timezone.

```typescript
function formatTimestamp(value: string | number | Date | undefined): string | null
```

- `value` — The timestamp value pulled from EXIF.

**Returns:** A locale-formatted date/time string, or `null` when missing
 *   or unparseable.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-exif-panel`.
