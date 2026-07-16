# @molecule/app-qr-code-react

Render a QR code as a crisp scalable SVG with optional center logo.

Used across coupon-deals-platform (redemption codes), restaurant-ordering
(table tokens), event-ticketing (tickets), and voting-polling (ballot
links). Encoding is delegated to the lightweight `qrcode-generator`
library; rendering is a single SVG `<path>` of horizontal-run rectangles
(much smaller DOM than per-module rects) plus an optional `<image>`
overlay for a center logo.

## Quick Start

```tsx
import { QrCode } from '@molecule/app-qr-code-react'

// Simple link
<QrCode value="https://example.com/redeem/ABC123" />

// Larger code with high error-correction and a center logo
<QrCode
  value="https://example.com/ticket/42"
  size={320}
  errorCorrection="H"
  logo={{ src: '/logo.png', alt: 'Brand' }}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-qr-code-react @molecule/app-react @molecule/app-ui qrcode-generator react
npm install -D @types/react
```

## API

### Interfaces

#### `QrCodeLogo`

Optional center-logo overlay descriptor.

```typescript
interface QrCodeLogo {
  /** Image URL or data URI to render in the center of the QR code. */
  src: string
  /**
   * Pixel size of the (square) logo. Defaults to 20% of `size`. Caller is
   * responsible for keeping the logo small enough that the code still scans;
   * use `errorCorrection='H'` when overlaying a logo.
   */
  size?: number
  /** Alt text for the logo image (decorative if omitted). */
  alt?: string
}
```

#### `QrCodeProps`

QrCode component props.

```typescript
interface QrCodeProps {
  /** String value to encode (URL, ticket id, ballot link, etc.). */
  value: string
  /** Output SVG width/height in pixels. Defaults to 200. */
  size?: number
  /** Error-correction level. Defaults to `'M'`. Use `'H'` if overlaying a logo. */
  errorCorrection?: QrErrorCorrectionLevel
  /** Foreground (dark module) color. Defaults to `'#000'`. */
  fgColor?: string
  /** Background color. Defaults to `'#fff'`. */
  bgColor?: string
  /** Quiet-zone margin in modules. Defaults to 2. */
  margin?: number
  /** Optional center logo overlay. */
  logo?: QrCodeLogo
  /**
   * Override the auto-generated `aria-label`. The default is the translated
   * `qrCode.aria.label` key with `{{value}}` interpolated.
   */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root via `cm.cn`. */
  className?: string
}
```

### Types

#### `QrErrorCorrectionLevel`

QR error-correction level. `L` ≈ 7%, `M` ≈ 15%, `Q` ≈ 25%, `H` ≈ 30%.

```typescript
type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
```

### Functions

#### `buildQrPath(qr, margin)`

Build the contiguous-run path data for the dark modules in a QR matrix. We
collapse horizontal runs of dark modules into a single `M h Z` instruction
per run, which is dramatically smaller than per-module rectangles while
still rendering pixel-perfect.

```typescript
function buildQrPath(qr: { getModuleCount: () => number; isDark: (row: number, col: number) => boolean; }, margin: number): string
```

- `qr` — The fully-built QR code object.
- `margin` — Quiet-zone margin in modules.

**Returns:** SVG path `d` attribute string.

#### `QrCode(props)`

Render a QR code as a crisp, scalable SVG. Accepts any string value
(URL, redemption code, ticket token, ballot link, etc.) and optionally
overlays a small center logo.

Styling routes through `@molecule/app-ui`'s `getClassMap()` for the
container; the only inline color attributes are the SVG `fill`s on the
background rect and the dark-modules path (real SVG attributes — not
Tailwind classes). Translations come from `@molecule/app-locales-qr-code`.

Used by coupon-deals-platform (redemption codes), restaurant-ordering
(table tokens), event-ticketing (tickets), voting-polling (ballot links).

```typescript
function QrCode({
  value,
  size = 200,
  errorCorrection = 'M',
  fgColor = '#000',
  bgColor = '#fff',
  margin = 2,
  logo,
  ariaLabel,
  className,
}: QrCodeProps): JSX.Element
```

- `props` — Component props.

**Returns:** The QR code SVG element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `qrcode-generator`
- `react`

Center-logo overlay reduces scannability — always pair it with
`errorCorrection='H'` and keep the logo at or below ~20% of the QR size.
Container styling routes through `@molecule/app-ui`'s `getClassMap()`;
the only inline values are SVG `fill` color attributes (real SVG attrs,
not Tailwind). Translations come from `@molecule/app-locales-qr-code`.

## Translations

Translation strings are provided by `@molecule/app-locales-qr-code`.
