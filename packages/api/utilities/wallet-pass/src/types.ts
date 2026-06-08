/**
 * Public types for `@molecule/api-wallet-pass`.
 *
 * Covers both Apple Wallet (.pkpass — a signed zip of pass.json + assets) and
 * Google Wallet (a JWT-signed pass-class + pass-object payload). Field names
 * follow the wallet-vendor schemas verbatim so payloads can be passed through
 * to the respective Apple / Google APIs without translation.
 *
 * @module
 */

/**
 * Apple Wallet barcode format. `format` controls how the redemption code is
 * rendered on the back of the pass.
 *
 * - `'PKBarcodeFormatQR'` — QR code (most common for event tickets).
 * - `'PKBarcodeFormatPDF417'` — PDF417 (US airline boarding passes).
 * - `'PKBarcodeFormatAztec'` — Aztec (international rail / boarding passes).
 * - `'PKBarcodeFormatCode128'` — Code-128 1D barcode.
 */
export type ApplePassBarcodeFormat =
  | 'PKBarcodeFormatQR'
  | 'PKBarcodeFormatPDF417'
  | 'PKBarcodeFormatAztec'
  | 'PKBarcodeFormatCode128'

/**
 * Apple Wallet barcode entry, used for both the legacy `barcode` field and
 * the modern `barcodes[]` array on `pass.json`.
 */
export interface ApplePassBarcode {
  /** Barcode visual format. */
  format: ApplePassBarcodeFormat
  /** Encoded payload (URL, ticket id, JWT, etc.). */
  message: string
  /** Encoding for `message`. Almost always `'iso-8859-1'`. */
  messageEncoding: string
  /** Optional human-readable text shown beneath the barcode. */
  altText?: string
}

/**
 * Apple Wallet pass-style discriminator. Drives the visual layout of the
 * pass on-device.
 */
export type ApplePassStyle = 'boardingPass' | 'coupon' | 'eventTicket' | 'generic' | 'storeCard'

/**
 * A single primary/secondary/auxiliary/back/header field on an Apple Wallet
 * pass. Apple's schema lets each field carry an arbitrary `key`, a localized
 * `label`, and a `value` (string or number). Additional formatting fields
 * (currencyCode, dateStyle, etc.) are passed through verbatim.
 */
export interface ApplePassField {
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

/**
 * The structured field groups that live under one of the pass-style keys
 * (`eventTicket`, `boardingPass`, etc.) in `pass.json`.
 */
export interface ApplePassStyleFields {
  headerFields?: ApplePassField[]
  primaryFields?: ApplePassField[]
  secondaryFields?: ApplePassField[]
  auxiliaryFields?: ApplePassField[]
  backFields?: ApplePassField[]
}

/**
 * The minimum set of fields Apple's signing server validates. Other fields
 * (relevantDate, locations, beacons, NFC, etc.) are passed through verbatim
 * via the index signature so callers can populate any of Apple's documented
 * keys without us having to re-export the entire schema.
 *
 * @see https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/TopLevel.html
 */
export interface ApplePassData {
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

/**
 * Certificate bundle required to sign an Apple `.pkpass`.
 *
 * Apple's PassKit signing flow uses a CMS detached signature over the
 * `manifest.json` file. Three artefacts are required:
 *
 * - `signerCertPem` — the developer-portal "Pass Type ID" cert (PEM).
 * - `signerKeyPem` — the matching private key (PEM, optionally encrypted).
 * - `wwdrCertPem` — Apple's WWDR intermediate cert chained into the CMS.
 *
 * Pass `password` if `signerKeyPem` is encrypted.
 */
export interface ApplePassCertificates {
  /** PEM-encoded "Pass Type ID" leaf certificate. */
  signerCertPem: string
  /** PEM-encoded private key matching `signerCertPem`. */
  signerKeyPem: string
  /** PEM-encoded Apple WWDR intermediate certificate. */
  wwdrCertPem: string
  /** Decryption passphrase for `signerKeyPem`, if it is encrypted. */
  password?: string
}

/**
 * Optional asset attachments included alongside `pass.json` in the .pkpass
 * zip. Keys are the file names Apple expects (e.g. `'icon.png'`,
 * `'icon@2x.png'`, `'logo.png'`, `'strip.png'`, `'thumbnail.png'`). Each
 * value is the raw bytes of that asset.
 */
export type ApplePassAssets = Record<string, Buffer | Uint8Array>

/**
 * Options accepted by {@link createApplePass}. The certificate bundle is
 * required; assets are optional but most apps need at least an `icon.png`.
 */
export interface CreateApplePassOptions {
  /** Pass payload — becomes `pass.json` inside the zip. */
  passData: ApplePassData
  /** Apple signing material — see {@link ApplePassCertificates}. */
  certificates: ApplePassCertificates
  /** Optional binary assets keyed by file name. */
  assets?: ApplePassAssets
}

/**
 * Google Wallet "pass class" — the shared template all matching pass
 * objects inherit from. Apps typically create one class per event /
 * loyalty-program and many objects underneath it.
 *
 * The shape mirrors Google's REST schema; only `id` is required at this
 * layer. All other Google fields (eventName, venue, dateTime, etc.) are
 * accepted via the index signature.
 *
 * @see https://developers.google.com/wallet/tickets/events/rest/v1/eventticketclass
 */
export interface GoogleWalletClass {
  /** Globally unique class id, formatted `'<issuerId>.<suffix>'`. */
  id: string
  /** Pass-through for Google-defined keys (eventName, venue, etc.). */
  [key: string]: unknown
}

/**
 * Google Wallet "pass object" — the per-user instance of a class.
 *
 * The shape mirrors Google's REST schema; `id` and `classId` are required.
 * All other Google fields (state, ticketHolderName, barcode, etc.) are
 * accepted via the index signature.
 *
 * @see https://developers.google.com/wallet/tickets/events/rest/v1/eventticketobject
 */
export interface GoogleWalletObject {
  /** Globally unique object id, formatted `'<issuerId>.<suffix>'`. */
  id: string
  /** Class id this object inherits from. */
  classId: string
  /** Pass-through for Google-defined keys (state, barcode, etc.). */
  [key: string]: unknown
}

/**
 * Google service-account credentials used to sign Wallet JWTs.
 *
 * Both fields come from the JSON key file Google issues for the
 * Wallet-issuer service account: `client_email` and `private_key`.
 */
export interface GoogleWalletServiceAccount {
  /** Service-account email. */
  clientEmail: string
  /** PEM-encoded RSA private key (with `\n` newlines). */
  privateKey: string
}

/**
 * Options accepted by {@link createGoogleWalletJwt}.
 */
export interface CreateGoogleWalletJwtOptions {
  /** Pass class definition (template). */
  passClass: GoogleWalletClass
  /** Pass object definition (per-user instance). */
  passObject: GoogleWalletObject
  /** Google issuer service account. */
  serviceAccount: GoogleWalletServiceAccount
  /** JWT origins (audience domains). Defaults to `['https://wallet.google']`. */
  origins?: string[]
}

/**
 * Apple `.pkpass` MIME type.
 */
export const PKPASS_CONTENT_TYPE = 'application/vnd.apple.pkpass'
