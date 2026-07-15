# @molecule/api-wallet-pass

Apple Wallet (.pkpass) and Google Wallet pass-object generation for
server-side ticket / coupon delivery.

Two independent sub-APIs:

- {@link createApplePass} — produces a signed `.pkpass` zip (CMS detached
  signature over `manifest.json`, using the Apple developer-portal
  "Pass Type ID" cert + WWDR intermediate). Output is a `Buffer` ready
  to send with `Content-Type: application/vnd.apple.pkpass`.
- {@link createGoogleWalletJwt} — produces an RS256-signed JWT containing
  the pass class + pass object payloads. Embed the JWT into
  `https://pay.google.com/gp/v/save/<jwt>` for the "save to wallet" flow.

Two HTTP handlers — {@link createApplePassHandler} and
{@link createGoogleWalletPassHandler} — wrap the generators with the same
minimal request/response contract used elsewhere in `@molecule/api-*`,
keeping the package framework-neutral.

The package never displays text on its own and has no companion locale
bond: pass field labels are caller-supplied and already localized.

## Quick Start

```ts
import { createApplePass, createGoogleWalletJwt } from '@molecule/api-wallet-pass'

// Apple
const pkpass = await createApplePass(passJsonPayload, signingCerts, assets)

// Google
const jwt = createGoogleWalletJwt(passClass, passObject, serviceAccount)
const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`
```

## Type
`feature`

## Installation
```bash
npm install @molecule/api-wallet-pass node-forge
npm install -D @types/node-forge
```

## API

### Interfaces

#### `ApplePassBarcode`

Apple Wallet barcode entry, used for both the legacy `barcode` field and
the modern `barcodes[]` array on `pass.json`.

```typescript
interface ApplePassBarcode {
  /** Barcode visual format. */
  format: ApplePassBarcodeFormat
  /** Encoded payload (URL, ticket id, JWT, etc.). */
  message: string
  /** Encoding for `message`. Almost always `'iso-8859-1'`. */
  messageEncoding: string
  /** Optional human-readable text shown beneath the barcode. */
  altText?: string
}
```

#### `ApplePassCertificates`

Certificate bundle required to sign an Apple `.pkpass`.

Apple's PassKit signing flow uses a CMS detached signature over the
`manifest.json` file. Three artefacts are required:

- `signerCertPem` — the developer-portal "Pass Type ID" cert (PEM).
- `signerKeyPem` — the matching private key (PEM, optionally encrypted).
- `wwdrCertPem` — Apple's WWDR intermediate cert chained into the CMS.

Pass `password` if `signerKeyPem` is encrypted.

```typescript
interface ApplePassCertificates {
  /** PEM-encoded "Pass Type ID" leaf certificate. */
  signerCertPem: string
  /** PEM-encoded private key matching `signerCertPem`. */
  signerKeyPem: string
  /** PEM-encoded Apple WWDR intermediate certificate. */
  wwdrCertPem: string
  /** Decryption passphrase for `signerKeyPem`, if it is encrypted. */
  password?: string
}
```

#### `ApplePassData`

The minimum set of fields Apple's signing server validates. Other fields
(relevantDate, locations, beacons, NFC, etc.) are passed through verbatim
via the index signature so callers can populate any of Apple's documented
keys without us having to re-export the entire schema.

```typescript
interface ApplePassData {
  /** Schema version. Always `1` for the current PassKit format. */
  formatVersion: 1
  /** Reverse-DNS pass-type id from the Apple developer portal. */
  passTypeIdentifier: string
  /** Apple developer team id (10 chars). */
  teamIdentifier: string
  /** Per-pass unique serial number. */
  serialNumber: string
  /** Customer-facing org name shown in the lock screen. */
  organizationName: string
  /** Localized short description for accessibility. */
  description: string
  /** Pass background color in `'rgb(r, g, b)'` form. */
  backgroundColor?: string
  /** Foreground (primary text) color in `'rgb(r, g, b)'` form. */
  foregroundColor?: string
  /** Label text color in `'rgb(r, g, b)'` form. */
  labelColor?: string
  /** Logo text shown next to the logo image. */
  logoText?: string
  /** Modern multi-barcode array. Prefer over the legacy `barcode` field. */
  barcodes?: ApplePassBarcode[]
  /** Legacy single-barcode field. Apple still requires it for old iOS versions. */
  barcode?: ApplePassBarcode
  /** Style-specific field group — exactly one of these keys must be present. */
  eventTicket?: ApplePassStyleFields
  boardingPass?: ApplePassStyleFields
  coupon?: ApplePassStyleFields
  generic?: ApplePassStyleFields
  storeCard?: ApplePassStyleFields
  /**
   * Web-service URL Apple Wallet pings for pass updates. Required when
   * `authenticationToken` is set.
   */
  webServiceURL?: string
  /** Token presented to the web service for pass updates. */
  authenticationToken?: string
  /** Pass-through for any remaining Apple-defined keys. */
  [extra: string]: unknown
}
```

#### `ApplePassField`

A single primary/secondary/auxiliary/back/header field on an Apple Wallet
pass. Apple's schema lets each field carry an arbitrary `key`, a localized
`label`, and a `value` (string or number). Additional formatting fields
(currencyCode, dateStyle, etc.) are passed through verbatim.

```typescript
interface ApplePassField {
  /** Stable field id. Must be unique within its parent style group. */
  key: string
  /** Localized label shown above the value. */
  label?: string
  /** Field value (string, number, ISO-8601 date, etc.). */
  value: string | number
  /** Localized text alignment. Apple-defined enum. */
  textAlignment?:
    | 'PKTextAlignmentLeft'
    | 'PKTextAlignmentCenter'
    | 'PKTextAlignmentRight'
    | 'PKTextAlignmentNatural'
  /** ISO-4217 currency code; turns the value into a localized currency string. */
  currencyCode?: string
  /** Date style for date-typed values. */
  dateStyle?:
    | 'PKDateStyleNone'
    | 'PKDateStyleShort'
    | 'PKDateStyleMedium'
    | 'PKDateStyleLong'
    | 'PKDateStyleFull'
  /** Time style for date-typed values. */
  timeStyle?:
    | 'PKDateStyleNone'
    | 'PKDateStyleShort'
    | 'PKDateStyleMedium'
    | 'PKDateStyleLong'
    | 'PKDateStyleFull'
  /** Number style for numeric values. */
  numberStyle?:
    | 'PKNumberStyleDecimal'
    | 'PKNumberStylePercent'
    | 'PKNumberStyleScientific'
    | 'PKNumberStyleSpellOut'
  /** Optional change message template (`'%@'` is replaced with the new value). */
  changeMessage?: string
}
```

#### `ApplePassStyleFields`

The structured field groups that live under one of the pass-style keys
(`eventTicket`, `boardingPass`, etc.) in `pass.json`.

```typescript
interface ApplePassStyleFields {
  headerFields?: ApplePassField[]
  primaryFields?: ApplePassField[]
  secondaryFields?: ApplePassField[]
  auxiliaryFields?: ApplePassField[]
  backFields?: ApplePassField[]
}
```

#### `CreateApplePassHandlerOptions`

Options for {@link createApplePassHandler}.

```typescript
interface CreateApplePassHandlerOptions {
  /** Loader that turns `passId` into the pass payload + signing material. */
  resolve: ApplePassResolver
  /** Optional file-name template for the `Content-Disposition` header. */
  fileName?: (passId: string) => string
}
```

#### `CreateApplePassOptions`

Options accepted by {@link createApplePass}. The certificate bundle is
required; assets are optional but most apps need at least an `icon.png`.

```typescript
interface CreateApplePassOptions {
  /** Pass payload — becomes `pass.json` inside the zip. */
  passData: ApplePassData
  /** Apple signing material — see {@link ApplePassCertificates}. */
  certificates: ApplePassCertificates
  /** Optional binary assets keyed by file name. */
  assets?: ApplePassAssets
}
```

#### `CreateGoogleWalletJwtOptions`

Options accepted by {@link createGoogleWalletJwt}.

```typescript
interface CreateGoogleWalletJwtOptions {
  /** Pass class definition (template). */
  passClass: GoogleWalletClass
  /** Pass object definition (per-user instance). */
  passObject: GoogleWalletObject
  /** Google issuer service account. */
  serviceAccount: GoogleWalletServiceAccount
  /** JWT origins (audience domains). Defaults to `['https://wallet.google']`. */
  origins?: string[]
}
```

#### `CreateGoogleWalletPassHandlerOptions`

Options for {@link createGoogleWalletPassHandler}.

```typescript
interface CreateGoogleWalletPassHandlerOptions {
  /** Loader that turns `passId` into pass class + object + signing creds. */
  resolve: GoogleWalletPassResolver
  /** Override the Google Wallet save-link prefix (used by tests). */
  saveUrlPrefix?: string
}
```

#### `GoogleWalletClass`

Google Wallet "pass class" — the shared template all matching pass
objects inherit from. Apps typically create one class per event /
loyalty-program and many objects underneath it.

The shape mirrors Google's REST schema; only `id` is required at this
layer. All other Google fields (eventName, venue, dateTime, etc.) are
accepted via the index signature.

```typescript
interface GoogleWalletClass {
  /** Globally unique class id, formatted `'<issuerId>.<suffix>'`. */
  id: string
  /** Pass-through for Google-defined keys (eventName, venue, etc.). */
  [key: string]: unknown
}
```

#### `GoogleWalletObject`

Google Wallet "pass object" — the per-user instance of a class.

The shape mirrors Google's REST schema; `id` and `classId` are required.
All other Google fields (state, ticketHolderName, barcode, etc.) are
accepted via the index signature.

```typescript
interface GoogleWalletObject {
  /** Globally unique object id, formatted `'<issuerId>.<suffix>'`. */
  id: string
  /** Class id this object inherits from. */
  classId: string
  /** Pass-through for Google-defined keys (state, barcode, etc.). */
  [key: string]: unknown
}
```

#### `GoogleWalletServiceAccount`

Google service-account credentials used to sign Wallet JWTs.

Both fields come from the JSON key file Google issues for the
Wallet-issuer service account: `client_email` and `private_key`.

```typescript
interface GoogleWalletServiceAccount {
  /** Service-account email. */
  clientEmail: string
  /** PEM-encoded RSA private key (with `\n` newlines). */
  privateKey: string
}
```

#### `WalletPassRequest`

Minimal request shape consumed by the wallet-pass handlers.

```typescript
interface WalletPassRequest {
  /** Path params; both handlers expect `passId`. */
  params: { passId: string }
}
```

#### `WalletPassResponse`

Minimal response shape consumed by the wallet-pass handlers.

```typescript
interface WalletPassResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
  /** Issue a redirect (302). */
  redirect: (url: string) => void
}
```

#### `ZipFileEntry`

One file to embed in the zip.

```typescript
interface ZipFileEntry {
  /** Path inside the archive (no leading slash). */
  name: string
  /** Raw bytes to store. */
  data: Buffer
}
```

### Types

#### `ApplePassAssets`

Optional asset attachments included alongside `pass.json` in the .pkpass
zip. Keys are the file names Apple expects (e.g. `'icon.png'`,
`'icon@2x.png'`, `'logo.png'`, `'strip.png'`, `'thumbnail.png'`). Each
value is the raw bytes of that asset.

```typescript
type ApplePassAssets = Record<string, Buffer | Uint8Array>
```

#### `ApplePassBarcodeFormat`

Apple Wallet barcode format. `format` controls how the redemption code is
rendered on the back of the pass.

- `'PKBarcodeFormatQR'` — QR code (most common for event tickets).
- `'PKBarcodeFormatPDF417'` — PDF417 (US airline boarding passes).
- `'PKBarcodeFormatAztec'` — Aztec (international rail / boarding passes).
- `'PKBarcodeFormatCode128'` — Code-128 1D barcode.

```typescript
type ApplePassBarcodeFormat =
  | 'PKBarcodeFormatQR'
  | 'PKBarcodeFormatPDF417'
  | 'PKBarcodeFormatAztec'
  | 'PKBarcodeFormatCode128'
```

#### `ApplePassResolver`

Resolver that loads pass payload + signing material for a given passId.
The handler stays decoupled from the storage layer (DataStore, files,
cache, etc.) by accepting the resolver as a closure.

```typescript
type ApplePassResolver = (passId: string) => Promise<
  | {
      passData: ApplePassData
      certificates: ApplePassCertificates
      assets?: ApplePassAssets
    }
  | undefined
>
```

#### `ApplePassStyle`

Apple Wallet pass-style discriminator. Drives the visual layout of the
pass on-device.

```typescript
type ApplePassStyle = 'boardingPass' | 'coupon' | 'eventTicket' | 'generic' | 'storeCard'
```

#### `GoogleWalletPassResolver`

Resolver that loads Google Wallet pass class + object + signing service
account for a given passId.

```typescript
type GoogleWalletPassResolver = (passId: string) => Promise<
  | {
      passClass: GoogleWalletClass
      passObject: GoogleWalletObject
      serviceAccount: GoogleWalletServiceAccount
      origins?: string[]
    }
  | undefined
>
```

### Functions

#### `buildZipBuffer(entries)`

Build a STORE-method zip Buffer from a list of in-memory file entries.

```typescript
function buildZipBuffer(entries: ZipFileEntry[]): Buffer<ArrayBufferLike>
```

- `entries` — Files to embed.

**Returns:** The complete zip bytes.

#### `crc32(data)`

Compute a CRC-32/IEEE checksum (the variant zip uses).

Pure-JS implementation — small enough that pulling in a dependency for
this one function would be silly.

```typescript
function crc32(data: Buffer<ArrayBufferLike>): number
```

- `data` — Bytes to checksum.

**Returns:** 32-bit unsigned CRC.

#### `createApplePass(passData, certificates, assets)`

Generate a fully-signed Apple Wallet `.pkpass` archive.

```typescript
function createApplePass(passData: ApplePassData, certificates: ApplePassCertificates, assets?: ApplePassAssets): Promise<Buffer<ArrayBufferLike>>
```

- `passData` — The `pass.json` payload (see {@link ApplePassData}).
- `certificates` — Signing material — see {@link ApplePassCertificates}.
- `assets` — Optional file-name → bytes map (icon.png, logo.png, ...).

**Returns:** A `Buffer` of the zipped, signed `.pkpass` ready to send with
 *   `Content-Type: application/vnd.apple.pkpass`.

#### `createApplePassHandler(options)`

Build a `(req, res) => Promise<void>` handler for
`GET /wallet/apple/:passId` returning the signed `.pkpass` blob.

```typescript
function createApplePassHandler(options: CreateApplePassHandlerOptions): (req: WalletPassRequest, res: WalletPassResponse) => Promise<void>
```

- `options` — Resolver + optional file-name builder.

**Returns:** Handler.

#### `createGoogleWalletJwt(passClass, passObject, serviceAccount, origins)`

Build and RS256-sign a Google Wallet JWT containing the pass class and
pass object. The returned string can be embedded directly into the
`https://pay.google.com/gp/v/save/<jwt>` redirect URL.

```typescript
function createGoogleWalletJwt(passClass: GoogleWalletClass, passObject: GoogleWalletObject, serviceAccount: GoogleWalletServiceAccount, origins?: readonly string[]): string
```

- `passClass` — Pass class definition (template).
- `passObject` — Pass object definition (per-user instance).
- `serviceAccount` — Service-account email + RSA private key.
- `origins` — Optional origin domains; defaults to `['https://wallet.google']`.

**Returns:** A signed JWT string.

#### `createGoogleWalletPassHandler(options)`

Build a `(req, res) => Promise<void>` handler for
`GET /wallet/google/:passId` issuing a 302 redirect to the
`https://pay.google.com/gp/v/save/<jwt>` URL.

```typescript
function createGoogleWalletPassHandler(options: CreateGoogleWalletPassHandlerOptions): (req: WalletPassRequest, res: WalletPassResponse) => Promise<void>
```

- `options` — Resolver + optional save-URL prefix override.

**Returns:** Handler.

#### `sha1Hex(data)`

Compute the SHA-1 hash of arbitrary bytes — re-exported helper used by
tests that need to verify manifest hashes.

```typescript
function sha1Hex(data: Buffer<ArrayBufferLike>): string
```

- `data` — Bytes to hash.

**Returns:** Lowercase 40-char hex digest.

### Constants

#### `PKPASS_CONTENT_TYPE`

Apple `.pkpass` MIME type.

```typescript
const PKPASS_CONTENT_TYPE: "application/vnd.apple.pkpass"
```

## Injection Notes

### Runtime Dependencies

- `node-forge`
