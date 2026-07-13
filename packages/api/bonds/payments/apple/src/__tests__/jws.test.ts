/**
 * Real-dependency tests for the JWS x5c chain verifier.
 *
 * A real self-signed ES256/P-256 test certificate chain (root → intermediate
 * → leaf, plus an unrelated root and an already-expired leaf) is GENERATED AT
 * RUNTIME with `openssl` in `beforeAll` — never committed, even as a
 * throwaway fixture: key material in the tree trips the repo's secret gate on
 * every commit touching this file, and a "harmless test key" is exactly the
 * thing that later gets copy-pasted somewhere real (same policy as the
 * web-push bond's TLS fixtures). Signing/verification then uses ONLY
 * `node:crypto` — nothing about the crypto is mocked: this proves
 * `decodeAndVerifyJWS` actually rejects a tampered payload, a broken
 * certificate chain, an untrusted root, an expired certificate, and a
 * non-ES256 algorithm — not just that it "looks like" it does.
 *
 * `openssl` ships in the dev/CI images and the sandbox base; if it is ever
 * absent the suite fails loudly with an actionable message. The expired leaf
 * is issued via `openssl ca -startdate/-enddate` (the only date-override
 * mechanism OpenSSL 3.0 offers for CA-signed certs).
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { createPrivateKey, sign as cryptoSign } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { decodeAndVerifyJWS } from '../jws.js'

// ─── Fixtures: a real ES256 test PKI, generated fresh per run ─────────────

/** Root CA (self-signed) — the TRUSTED anchor for the "happy path" tests. */
let ROOT_DER_B64: string
/** Intermediate CA (signed by root). */
let INTERMEDIATE_DER_B64: string
/** Leaf certificate (signed by the intermediate) — valid, not expired. */
let LEAF_DER_B64: string
/** The leaf certificate's EC private key PEM — signs test JWS payloads. */
let LEAF_PRIVATE_KEY_PEM: string
/** An UNRELATED root CA — used to prove the trusted-root anchor is enforced. */
let UNTRUSTED_ROOT_DER_B64: string
/** A leaf signed by the REAL intermediate, but with `notAfter` already in the past. */
let EXPIRED_LEAF_DER_B64: string
/** The expired leaf's matching private key PEM. */
let EXPIRED_LEAF_PRIVATE_KEY_PEM: string
let ROOT_DER: Buffer
let UNTRUSTED_ROOT_DER: Buffer
let VALID_CHAIN: string[]

/** A certificate PEM's body IS its DER, base64-encoded — strip armor + whitespace. */
function pemToDerB64(pem: string): string {
  return pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
}

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'mol-apple-jws-pki-'))
  const ossl = (...args: string[]): void => {
    try {
      execFileSync('openssl', args, { stdio: 'pipe', cwd: dir })
    } catch (error) {
      throw new Error(
        'apple JWS integration test needs `openssl` on PATH to generate its throwaway ' +
          'ES256 test certificate chain at runtime (no key material is committed to the repo).',
        { cause: error },
      )
    }
  }

  // Keys (P-256, throwaway — live only in this tmpdir for the openssl calls).
  for (const name of ['root', 'untrusted', 'int', 'leaf', 'expired']) {
    ossl('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', `${name}.key`)
  }

  // Self-signed roots.
  const req = (key: string, cn: string, out: string): void =>
    ossl(
      'req',
      '-x509',
      '-new',
      '-key',
      `${key}.key`,
      '-sha256',
      '-days',
      '3650',
      '-subj',
      `/CN=${cn}/O=Test/C=US`,
      '-out',
      out,
    )
  req('root', 'Test Root CA', 'root.pem')
  req('untrusted', 'Untrusted Root CA', 'untrusted.pem')

  // Intermediate: CSR signed by root, with CA basic constraints.
  ossl(
    'req',
    '-new',
    '-key',
    'int.key',
    '-subj',
    '/CN=Test Intermediate/O=Test/C=US',
    '-out',
    'int.csr',
  )
  writeFileSync(
    join(dir, 'ca-ext.cnf'),
    'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign\n',
  )
  ossl(
    'x509',
    '-req',
    '-in',
    'int.csr',
    '-CA',
    'root.pem',
    '-CAkey',
    'root.key',
    '-CAcreateserial',
    '-sha256',
    '-days',
    '3650',
    '-extfile',
    'ca-ext.cnf',
    '-out',
    'int.pem',
  )

  // Valid leaf: CSR signed by the intermediate.
  ossl('req', '-new', '-key', 'leaf.key', '-subj', '/CN=Test Leaf/O=Test/C=US', '-out', 'leaf.csr')
  ossl(
    'x509',
    '-req',
    '-in',
    'leaf.csr',
    '-CA',
    'int.pem',
    '-CAkey',
    'int.key',
    '-CAcreateserial',
    '-sha256',
    '-days',
    '3650',
    '-out',
    'leaf.pem',
  )

  // EXPIRED leaf: `openssl x509 -req` cannot back-date on OpenSSL 3.0, so use
  // the `openssl ca` machinery with explicit -startdate/-enddate in the past.
  ossl(
    'req',
    '-new',
    '-key',
    'expired.key',
    '-subj',
    '/CN=Test Expired Leaf/O=Test/C=US',
    '-out',
    'expired.csr',
  )
  writeFileSync(
    join(dir, 'ca.cnf'),
    [
      '[ca]',
      'default_ca = test_ca',
      '[test_ca]',
      'database = index.txt',
      'new_certs_dir = .',
      'serial = ca-serial',
      'default_md = sha256',
      'policy = test_pol',
      'email_in_dn = no',
      '[test_pol]',
      'commonName = supplied',
      'organizationName = optional',
      'countryName = optional',
      '',
    ].join('\n'),
  )
  writeFileSync(join(dir, 'index.txt'), '')
  writeFileSync(join(dir, 'ca-serial'), '1000\n')
  ossl(
    'ca',
    '-batch',
    '-config',
    'ca.cnf',
    '-cert',
    'int.pem',
    '-keyfile',
    'int.key',
    '-in',
    'expired.csr',
    '-startdate',
    '20200101000000Z',
    '-enddate',
    '20200102000000Z',
    '-notext',
    '-out',
    'expired.pem',
  )

  const read = (f: string): string => readFileSync(join(dir, f), 'utf8')
  ROOT_DER_B64 = pemToDerB64(read('root.pem'))
  UNTRUSTED_ROOT_DER_B64 = pemToDerB64(read('untrusted.pem'))
  INTERMEDIATE_DER_B64 = pemToDerB64(read('int.pem'))
  LEAF_DER_B64 = pemToDerB64(read('leaf.pem'))
  EXPIRED_LEAF_DER_B64 = pemToDerB64(read('expired.pem'))
  LEAF_PRIVATE_KEY_PEM = read('leaf.key')
  EXPIRED_LEAF_PRIVATE_KEY_PEM = read('expired.key')
  ROOT_DER = Buffer.from(ROOT_DER_B64, 'base64')
  UNTRUSTED_ROOT_DER = Buffer.from(UNTRUSTED_ROOT_DER_B64, 'base64')
  VALID_CHAIN = [LEAF_DER_B64, INTERMEDIATE_DER_B64, ROOT_DER_B64]

  rmSync(dir, { recursive: true, force: true })
})

/** Builds a compact JWS: signs `payload` with `privateKeyPem` using real ES256 (IEEE-P1363) and embeds `x5c`. */
function buildJWS(
  payload: Record<string, unknown>,
  x5cCertsB64: string[],
  privateKeyPem: string,
  alg = 'ES256',
): string {
  const header = { alg, x5c: x5cCertsB64 }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`)
  const key = createPrivateKey(privateKeyPem)
  const signature = cryptoSign('sha256', signingInput, { key, dsaEncoding: 'ieee-p1363' })
  return `${headerB64}.${payloadB64}.${signature.toString('base64url')}`
}

describe('decodeAndVerifyJWS', () => {
  it('REGRESSION: verifies a real ES256 JWS with a valid x5c chain rooted at the trusted root, and returns the decoded payload', () => {
    const jws = buildJWS({ hello: 'world', n: 42 }, VALID_CHAIN, LEAF_PRIVATE_KEY_PEM)

    const payload = decodeAndVerifyJWS(jws, ROOT_DER)

    expect(payload).toEqual({ hello: 'world', n: 42 })
  })

  it('REGRESSION [security]: rejects a tampered payload even though the signature bytes are unchanged', () => {
    const jws = buildJWS({ amount: 1 }, VALID_CHAIN, LEAF_PRIVATE_KEY_PEM)
    const [headerB64, , signatureB64] = jws.split('.')
    // Splice in a different payload without re-signing — simulates an
    // attacker modifying the body of an intercepted/forged notification.
    const tamperedPayloadB64 = Buffer.from(JSON.stringify({ amount: 999999 })).toString('base64url')
    const tampered = `${headerB64}.${tamperedPayloadB64}.${signatureB64}`

    expect(() => decodeAndVerifyJWS(tampered, ROOT_DER)).toThrow(/signature does not verify/i)
  })

  it('REGRESSION [security]: rejects a chain that does NOT terminate at the trusted root', () => {
    // A validly self-signed chain (real leaf→intermediate→root signatures),
    // but decodeAndVerifyJWS is asked to trust a DIFFERENT, unrelated root.
    const jws = buildJWS({ ok: true }, VALID_CHAIN, LEAF_PRIVATE_KEY_PEM)

    expect(() => decodeAndVerifyJWS(jws, UNTRUSTED_ROOT_DER)).toThrow(
      /does not terminate at the trusted root/i,
    )
  })

  it('REGRESSION [security]: rejects a broken chain (x5c[0] not actually signed by x5c[1])', () => {
    // The leaf IS validly signed by the real intermediate, but x5c claims it
    // chains through the UNRELATED root instead of the real intermediate —
    // the signature check must catch this, not just "3 certs present."
    const jws = buildJWS(
      { ok: true },
      [LEAF_DER_B64, UNTRUSTED_ROOT_DER_B64, ROOT_DER_B64],
      LEAF_PRIVATE_KEY_PEM,
    )

    expect(() => decodeAndVerifyJWS(jws, ROOT_DER)).toThrow(/certificate chain is broken/i)
  })

  it('REGRESSION [security]: rejects a non-ES256 alg (blocks an alg-confusion downgrade)', () => {
    const jws = buildJWS({ ok: true }, VALID_CHAIN, LEAF_PRIVATE_KEY_PEM, 'HS256')

    expect(() => decodeAndVerifyJWS(jws, ROOT_DER)).toThrow(/Unsupported JWS alg/i)
  })

  it('REGRESSION [security]: rejects an expired certificate in the chain', () => {
    const jws = buildJWS(
      { ok: true },
      [EXPIRED_LEAF_DER_B64, INTERMEDIATE_DER_B64, ROOT_DER_B64],
      EXPIRED_LEAF_PRIVATE_KEY_PEM,
    )

    expect(() => decodeAndVerifyJWS(jws, ROOT_DER)).toThrow(/expired or not yet valid/i)
  })

  it('rejects a malformed JWS (wrong number of dot-separated parts)', () => {
    expect(() => decodeAndVerifyJWS('not.a.valid.jws.string', ROOT_DER)).toThrow(/Malformed JWS/i)
    expect(() => decodeAndVerifyJWS('only-one-part', ROOT_DER)).toThrow(/Malformed JWS/i)
  })

  it('rejects a header with no x5c chain', () => {
    const header = { alg: 'ES256' }
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
    const payloadB64 = Buffer.from(JSON.stringify({ ok: true })).toString('base64url')
    const jws = `${headerB64}.${payloadB64}.fakesignature`

    expect(() => decodeAndVerifyJWS(jws, ROOT_DER)).toThrow(/missing an x5c/i)
  })

  it('accepts a chain whose last x5c entry IS the trusted root itself (Apple includes the root)', () => {
    // Already covered by the happy-path test (VALID_CHAIN ends with ROOT_DER_B64),
    // but assert explicitly that the "byte-for-byte equal" branch is what's exercised.
    const jws = buildJWS({ variant: 'root-included' }, VALID_CHAIN, LEAF_PRIVATE_KEY_PEM)

    expect(decodeAndVerifyJWS(jws, ROOT_DER)).toEqual({ variant: 'root-included' })
  })

  it('accepts a chain that OMITS the root from x5c, as long as the last entry was issued by the trusted root', () => {
    const jws = buildJWS(
      { variant: 'root-omitted' },
      [LEAF_DER_B64, INTERMEDIATE_DER_B64], // no ROOT_DER_B64 entry
      LEAF_PRIVATE_KEY_PEM,
    )

    expect(decodeAndVerifyJWS(jws, ROOT_DER)).toEqual({ variant: 'root-omitted' })
  })
})
