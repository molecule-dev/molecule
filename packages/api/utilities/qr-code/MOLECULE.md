# @molecule/api-qr-code

Server-side QR code generation for molecule.dev. Produces SVG strings,
PNG `Buffer`s, or base64 `data:` URLs from arbitrary string input —
suitable for email templates (ticket QRs, redemption codes), PDF
inclusion, push-notification icons, and any other server-rendered
delivery channel.

Companion to the client-side `@molecule/app-qr-code-react` package; the
two pin the identical `qrcode-generator` version so encoded output is
byte-identical between server and client for the same inputs.

## Quick Start

```ts
import { generateQrCode } from '@molecule/api-qr-code'

// SVG string (default)
const svg = await generateQrCode('https://example.com')

// PNG Buffer for attachments / PDF inclusion
const png = await generateQrCode('TICKET-1234', {
  format: 'png',
  size: 256,
  errorCorrection: 'H',
})

// data: URL for inline <img> in HTML emails
const dataUrl = await generateQrCode('coupon-redeem-9z', { format: 'dataUrl' })
```

```ts
// HTTP handler — Express adapter
import { createQrCodeHandler } from '@molecule/api-qr-code'

const handle = createQrCodeHandler()
router.get('/qr/:value', async (req, res, next) => {
  try {
    await handle(
      { params: { value: req.params.value }, query: req.query },
      {
        setHeader: (n, v) => res.setHeader(n, v),
        setStatus: (s) => { res.status(s) },
        sendBuffer: (b) => { res.end(b) },
        sendText: (t) => { res.send(t) },
        sendJson: (j) => { res.json(j) },
      },
    )
  } catch (err) { next(err) }
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-qr-code qrcode-generator
```

## API

### Interfaces

#### `CreateQrCodeHandlerOptions`

Options for {@link createQrCodeHandler}.

```typescript
interface CreateQrCodeHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (value: string) => void | Promise<void>
  /** Maximum allowed `size` in pixels. Defaults to 1024. */
  maxSize?: number
  /** Default size when `?size=` is omitted. Defaults to 200. */
  defaultSize?: number
  /** Default format when `?format=` is omitted. Defaults to `'png'`. */
  defaultFormat?: QrCodeFormat
}
```

#### `GenerateQrCodeOptions`

Options accepted by {@link generateQrCode}.

```typescript
interface GenerateQrCodeOptions {
  /** Output format. Defaults to `'svg'`. */
  format?: QrCodeFormat
  /** Output width/height in pixels. Defaults to 200. */
  size?: number
  /** Error-correction level. Defaults to `'M'`. */
  errorCorrection?: QrErrorCorrectionLevel
  /** Quiet-zone margin in modules (the QR-code "pixels"). Defaults to 2. */
  margin?: number
  /** Foreground (dark module) color. Defaults to `'#000'`. */
  fgColor?: string
  /** Background color. Defaults to `'#fff'`. */
  bgColor?: string
}
```

#### `QrCodeRequest`

Minimal request shape consumed by {@link createQrCodeHandler}.

```typescript
interface QrCodeRequest {
  /** Value extracted from the URL path (`:value` route param). */
  params: { value: string }
  /**
   * Parsed querystring map. Recognized keys: `format`, `size`,
   * `errorCorrection`, `margin`, `fgColor`, `bgColor`.
   */
  query: Record<string, string | string[] | undefined>
}
```

#### `QrCodeResponse`

Minimal response shape consumed by {@link createQrCodeHandler}.

```typescript
interface QrCodeResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a text body (UTF-8) and end the response. */
  sendText: (body: string) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
}
```

#### `QrMatrix`

Built QR-code matrix paired with its module count and chosen margin.

The matrix is a 2D `boolean[][]` where `true` is a "dark" module. Callers
should add `margin` modules of quiet zone on every side when rendering.

```typescript
interface QrMatrix {
  /** Edge length of the QR matrix, in modules (excludes the margin). */
  moduleCount: number
  /** Quiet-zone margin in modules (same on every side). */
  margin: number
  /** `true` when the module at `[row][col]` is dark. */
  isDark: (row: number, col: number) => boolean
}
```

#### `RenderPngOptions`

Options for {@link renderPng}.

```typescript
interface RenderPngOptions {
  /** Output width/height in pixels. */
  size: number
  /** Foreground (dark module) color. */
  fgColor: string
  /** Background color. */
  bgColor: string
}
```

#### `RenderSvgOptions`

Options for {@link renderSvg}.

```typescript
interface RenderSvgOptions {
  /** Output width/height in pixels. */
  size: number
  /** Foreground (dark module) color. */
  fgColor: string
  /** Background color. */
  bgColor: string
}
```

### Types

#### `QrCodeFormat`

Output format for {@link generateQrCode}.

- `'svg'` — returns a UTF-8 SVG string.
- `'png'` — returns a `Buffer` containing PNG bytes.
- `'dataUrl'` — returns a `data:image/svg+xml;base64,...` string suitable
  for embedding directly in an `<img src>` attribute or HTML email.

```typescript
type QrCodeFormat = 'svg' | 'png' | 'dataUrl'
```

#### `QrErrorCorrectionLevel`

QR error-correction level. Higher levels recover more damage at the cost
of denser modules.

- `'L'` — ~7% recovery
- `'M'` — ~15% recovery (default)
- `'Q'` — ~25% recovery
- `'H'` — ~30% recovery (use when overlaying a logo)

```typescript
type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
```

### Functions

#### `buildMatrix(value, errorCorrection, margin)`

Build a QR-code matrix for the given value at the requested error-correction
level. Uses `qrcode-generator` with `typeNumber=0` so the smallest type that
fits is auto-selected.

```typescript
function buildMatrix(value: string, errorCorrection?: QrErrorCorrectionLevel, margin?: number): QrMatrix
```

- `value` — String to encode (URL, ticket id, redemption code, etc.).
- `errorCorrection` — Error-correction level. Defaults to `'M'`.
- `margin` — Quiet-zone margin in modules. Defaults to 2.

**Returns:** Matrix descriptor — module count + dark-module accessor.

#### `buildSvgPath(matrix)`

Build the contiguous-run path data for the dark modules in a QR matrix. We
collapse horizontal runs of dark modules into a single `M h v h Z`
instruction per run, which is dramatically smaller than per-module
rectangles while still rendering pixel-perfect.

```typescript
function buildSvgPath(matrix: QrMatrix): string
```

- `matrix` — Built QR matrix from {@link buildMatrix}.

**Returns:** SVG path `d` attribute string.

#### `createQrCodeHandler(handlerOptions)`

Build a `(req, res) => Promise<void>` handler that decodes a path-param
value, generates the QR code in the requested format, and writes the
bytes back with appropriate `Content-Type` headers.

```typescript
function createQrCodeHandler(handlerOptions?: CreateQrCodeHandlerOptions): (req: QrCodeRequest, res: QrCodeResponse) => Promise<void>
```

- `handlerOptions` — Optional pre-flight validator, max size, defaults.

**Returns:** An async handler accepting `{ params, query }` and a response shim.

#### `generateQrCode(value, options)`

Generate a QR code in the requested format.

- `format: 'svg'` returns an SVG markup string.
- `format: 'png'` returns a PNG `Buffer` (hand-rolled, no native dep).
- `format: 'dataUrl'` returns a `data:image/svg+xml;base64,...` string
  suitable for direct inclusion in `<img src>` (HTML emails, PDFs).

```typescript
function generateQrCode(value: string, options?: GenerateQrCodeOptions): Promise<string | Buffer<ArrayBufferLike>>
```

- `value` — String to encode (URL, ticket id, redemption code, etc.).
- `options` — Optional output controls (format, size, error correction, colors).

**Returns:** SVG / data-URL string, or PNG `Buffer`.

#### `parseColor(input)`

Parse a CSS hex color string (`#rgb`, `#rrggbb`) into an RGB triplet.
Throws on any other format — callers needing arbitrary CSS color names
(`rgba(...)`, `hsl(...)`, named colors) should pre-resolve to hex.

```typescript
function parseColor(input: string): [number, number, number]
```

- `input` — Hex color string.

**Returns:** `[r, g, b]` with each component in 0..255.

#### `renderPng(matrix, options)`

Render a QR matrix as PNG bytes. Hand-rolled (no native dependency) so the
package stays portable across Node versions and Linux distributions.

The image is emitted at the natural pixel-per-module resolution closest to
`size`: each module is scaled up to `floor(size / totalModules)` pixels (≥ 1).
The resulting image is then padded with the background color to reach the
requested `size × size` so callers always get back the dimensions they
asked for.

```typescript
function renderPng(matrix: QrMatrix, options: RenderPngOptions): Buffer<ArrayBufferLike>
```

- `matrix` — Built QR matrix from {@link buildMatrix}.
- `options` — Output size + colors.

**Returns:** PNG byte buffer.

#### `renderSvg(matrix, options)`

Render a QR matrix as a crisp, scalable SVG string. The SVG uses a
`viewBox` sized to the matrix + quiet zone, so the rendered pixel size
is purely a function of the `width`/`height` attributes.

```typescript
function renderSvg(matrix: QrMatrix, options: RenderSvgOptions): string
```

- `matrix` — Built QR matrix from {@link buildMatrix}.
- `options` — Output size + colors.

**Returns:** SVG markup as a string.

### Constants

#### `PNG_CONTENT_TYPE`

MIME type for PNG output.

```typescript
const PNG_CONTENT_TYPE: "image/png"
```

#### `SVG_CONTENT_TYPE`

MIME type for SVG output.

```typescript
const SVG_CONTENT_TYPE: "image/svg+xml"
```

## Injection Notes

### Runtime Dependencies

- `qrcode-generator`

The PNG encoder is hand-rolled (PNG signature → IHDR → deflated IDAT →
IEND) so the package has zero native dependencies. SVG output is preferred
whenever the rendering target supports it: it scales infinitely, is far
smaller on the wire, and is what the React companion uses too.

Colors are CSS hex (`'#000'`, `'#ff00aa'`, etc.). Named colors / `rgba()`
/`hsl()` are not supported by the PNG encoder — pre-resolve to hex.

The package never displays text on its own and has no companion locale
bond: the encoded value is always opaque caller-supplied data.
