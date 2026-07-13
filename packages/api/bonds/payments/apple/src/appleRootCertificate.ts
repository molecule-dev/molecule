/**
 * Apple's Root CA - G3 certificate — the trust anchor for App Store Server
 * Notifications V2 (`signedPayload`) JWS chains.
 *
 * @remarks
 * DER bytes of the certificate Apple publishes at
 * https://www.apple.com/certificateauthority/AppleRootCA-G3.cer, embedded so
 * v2 notification verification (`{@link decodeAndVerifyJWS}` in `jws.ts`)
 * works fully offline — no live fetch of Apple's cert on every notification.
 *
 * This is the SAME root App Store Server Notifications V2 and the App Store
 * Server API sign against (a 3-certificate `x5c` chain: leaf → intermediate →
 * this root). It expires 2039-04-30 — Apple rotating it before then is
 * possible but unannounced as of this writing.
 *
 * To refresh (only if Apple rotates this root): re-download from the URL
 * above and verify the SHA-256 fingerprint against Apple's published value at
 * https://www.apple.com/certificateauthority/ BEFORE replacing the constant
 * below — this fingerprint is the entire trust anchor for verifying Apple's
 * payment notifications, so a wrong value here must fail closed (verification
 * always rejects), never fail open.
 *
 * Verified fingerprint (SHA-256):
 * `63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79`
 *
 * @module
 */

/** Base64 DER encoding of Apple's "Apple Root CA - G3" certificate (expires 2039-04-30). */
const APPLE_ROOT_CA_G3_BASE64 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS' +
  'QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u' +
  'IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN' +
  'MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS' +
  'b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y' +
  'aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49' +
  'AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf' +
  'TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517' +
  'IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr' +
  'MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA' +
  'MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4' +
  'at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM' +
  '6BgD56KyKA=='

/**
 * DER bytes of Apple's Root CA - G3 certificate — the trust anchor
 * {@link decodeAndVerifyJWS} pins App Store Server Notifications V2 JWS
 * chains to.
 */
export const APPLE_ROOT_CA_G3_DER: Buffer = Buffer.from(APPLE_ROOT_CA_G3_BASE64, 'base64')
