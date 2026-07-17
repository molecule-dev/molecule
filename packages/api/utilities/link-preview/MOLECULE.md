# @molecule/api-link-preview

URL preview / OG-image scraper.

Fetches a URL and returns normalized
`{ title, description, image, siteName, url, type, oembedUrl }`
metadata extracted from Open Graph, Twitter Card, oEmbed discovery,
`<title>`, and `<meta name="description">` tags. Used by
link-aggregator (preview cards), blog (link blocks), and social
apps (post previews).

Built-in safety:

- SSRF guard refuses private/loopback/link-local hosts by default.
- The SSRF guard is DNS-aware: it resolves each host before fetching
  and rejects it if any A/AAAA record lands in a private/internal/
  metadata range, so a public hostname that resolves to a private
  address (DNS-rebinding / resolve-to-internal) is caught — not just
  IP/host literals. On the default fetch path the connection is pinned
  to the validated address (no check-then-connect rebind window); an
  injected `options.fetch` is still resolve-validated but owns its own
  transport, so for a hard guarantee there also restrict egress at the
  network layer.
- Manual redirect handling re-validates each hop.
- Hard timeout (default 5s) via `AbortController`.
- Body-size cap (default 1 MiB) — large pages are truncated.
- Content-type guard rejects non-HTML responses (PDF, images, JSON,
  …).
- Polite descriptive `User-Agent`.

Pure HTTP fetch — no DOM, no headless browser. Works in any Node ≥
20 runtime that ships `fetch`.

## Quick Start

```ts
import { getLinkPreview } from '@molecule/api-link-preview'

const preview = await getLinkPreview('https://example.com/article')
// → { title, description, image, siteName, url, type, oembedUrl }
```

```ts
// With a @molecule/api-cache-compatible adapter:
const preview = await getLinkPreview(url, {
  cache: myCacheAdapter,
  cacheTtlMs: 600_000,
  timeoutMs: 3_000,
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-link-preview undici
```

## API

### Interfaces

#### `FetchedHtml`

Result of a successful fetch — the response body decoded as text plus
the final URL after any redirects.

```typescript
interface FetchedHtml {
  /**
   * Truncated body bytes decoded as UTF-8 text.
   */
  body: string

  /**
   * Final URL after redirects.
   */
  finalUrl: string
}
```

#### `GetLinkPreviewOptions`

Options for {@link getLinkPreview}.

```typescript
interface GetLinkPreviewOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`.
   * Useful for tests, custom retry/timeout logic, or running behind an
   * HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * `User-Agent` header sent with the request. Defaults to a polite
   * descriptive UA. Many sites return 403 for bare or empty UAs.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number

  /**
   * Maximum body size in bytes that will be parsed. Defaults to
   * 1_048_576 (1 MiB). Bodies larger than this are truncated and parsed
   * as far as possible.
   */
  maxBodyBytes?: number

  /**
   * Maximum number of redirects to follow. Defaults to 5. Most consumer
   * sites use at most 1–2 hops.
   */
  maxRedirects?: number

  /**
   * Optional cache. When provided, successful previews are cached under
   * the input URL.
   */
  cache?: LinkPreviewCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 600_000
   * (10 minutes). Only applied when {@link GetLinkPreviewOptions.cache}
   * is set.
   */
  cacheTtlMs?: number

  /**
   * SSRF guard — when `false` (the default) requests to private /
   * loopback / link-local IP ranges are refused, including hosts that
   * resolve to such an address (DNS-aware). Set `true` to allow them
   * (for example in an internal-network scraper). Use with care.
   */
  allowPrivateNetworks?: boolean

  /**
   * Additional accepted content-type prefixes. By default only
   * `text/html` and `application/xhtml+xml` are parsed. Anything else
   * (PDF, image, audio, video, JSON …) is rejected with an error.
   */
  acceptedContentTypes?: string[]
}
```

#### `LinkPreview`

Normalized link-preview metadata returned by {@link getLinkPreview}.

All fields are optional — fields that cannot be derived from the page
are left `undefined` rather than guessed. The `url` field is the final
resolved URL after redirects, which may differ from the input URL.

```typescript
interface LinkPreview {
  /**
   * Page title — preferred order: `og:title`, `twitter:title`, `<title>`.
   */
  title?: string

  /**
   * Short description — preferred order: `og:description`,
   * `twitter:description`, `<meta name="description">`.
   */
  description?: string

  /**
   * Absolute image URL — preferred order: `og:image`, `og:image:url`,
   * `og:image:secure_url`, `twitter:image`, `twitter:image:src`. Relative
   * URLs in the source are resolved against the final page URL.
   */
  image?: string

  /**
   * Site or publication name — `og:site_name` falling back to the
   * hostname of the final URL.
   */
  siteName?: string

  /**
   * Final URL after any redirects. Always present in successful results.
   */
  url: string

  /**
   * Open Graph object type — e.g. `"website"`, `"article"`, `"video"`.
   * Falls back to `"website"` when not declared.
   */
  type?: string

  /**
   * oEmbed discovery endpoint detected via
   * `<link rel="alternate" type="application/json+oembed">`.
   * Consumers can fetch this separately for embed HTML; this package
   * does NOT follow the link automatically.
   */
  oembedUrl?: string
}
```

#### `LinkPreviewCache`

Minimal cache contract — compatible with `@molecule/api-cache`
providers. Only `get`/`set` of string keys to JSON-serializable
values is required.

```typescript
interface LinkPreviewCache {
  /**
   * Get a previously cached preview, or `undefined` if not present.
   */
  get(key: string): Promise<LinkPreview | undefined> | LinkPreview | undefined

  /**
   * Set a preview with an optional TTL in milliseconds.
   */
  set(key: string, value: LinkPreview, ttlMs?: number): Promise<void> | void
}
```

#### `ResolvedAddress`

A resolved DNS record — the shape returned by node:dns/promises
`lookup(host, { all: true })`.

```typescript
interface ResolvedAddress {
  /**
   * The resolved IP address literal (v4 or v6).
   */
  address: string

  /**
   * IP family — `4` or `6`.
   */
  family: number
}
```

### Types

#### `HostLookup`

DNS resolver injected into {@link hostResolvesToPrivate} /
{@link isHostBlocked}. Defaults to node:dns/promises
`lookup(host, { all: true })`; overridable so unit tests can supply
deterministic answers without touching real DNS.

```typescript
type HostLookup = (hostname: string) => Promise<ResolvedAddress[]>
```

#### `LinkPreviewErrorCode`

Stable error codes emitted by {@link LinkPreviewError}.

```typescript
type LinkPreviewErrorCode =
  | 'invalid-url'
  | 'private-network-blocked'
  | 'unsupported-protocol'
  | 'http-error'
  | 'unsupported-content-type'
  | 'too-many-redirects'
  | 'timeout'
  | 'fetch-failed'
```

### Classes

#### `LinkPreviewError`

Error thrown when {@link getLinkPreview} cannot produce a preview.

`code` is a stable machine-readable string; `message` is the
developer-facing English description (handler-error pattern — locale
bond not required for this utility).

### Functions

#### `fetchHtml(inputUrl, options)`

Fetch the HTML at `url` with manual redirect handling, total timeout,
and body-size cap. Returns the truncated body plus the final URL.

Redirects are followed manually so each intermediate URL is
SSRF-validated — the built-in `redirect: 'follow'` mode would let a
malicious server bounce us to `127.0.0.1`.

SSRF is enforced per-hop by a DNS-aware guard ({@link isHostBlocked}):
a public hostname whose A/AAAA record resolves to a private/internal/
metadata address is rejected before the request. On the default fetch
path the connection is additionally pinned to the validated address
(via {@link ssrfSafeAgent}) so it cannot rebind between check and
connect. An injected `options.fetch` is guarded by the pre-fetch
resolution but not pinned (it owns its transport).

```typescript
function fetchHtml(inputUrl: string, options?: GetLinkPreviewOptions): Promise<FetchedHtml>
```

- `inputUrl` — URL to fetch.
- `options` — Caller-supplied options. See

**Returns:** Truncated HTML body + final URL.

#### `getLinkPreview(url, options)`

Fetch `url`, extract Open Graph / Twitter Card / oEmbed metadata, and
return a normalized {@link LinkPreview}.

Honors:

- SSRF guard — rejects private/loopback/link-local hosts, and hosts
  that RESOLVE to such addresses (DNS-aware), unless
  `allowPrivateNetworks: true` is passed.
- Manual redirect following with per-hop SSRF re-validation.
- Total timeout via `AbortController` (default 5s).
- Body-size cap (default 1 MiB) — bodies larger than the cap are
  truncated and parsed as far as possible.
- Content-type guard — rejects PDFs, images, audio, video, JSON, …
  (anything outside `text/html` / `application/xhtml+xml` unless
  `acceptedContentTypes` is overridden).
- Optional response cache (`@molecule/api-cache`-compatible).

Locale bonds are intentionally not used — error messages on the
thrown {@link import('./types.js').LinkPreviewError} are
developer-facing English (handler-error pattern). Consumers should
map `error.code` to translated user-facing strings in the calling
handler.

```typescript
function getLinkPreview(url: string, options?: GetLinkPreviewOptions): Promise<LinkPreview>
```

- `url` — URL to preview. Must be `http:` or `https:`.
- `options` — Caller-supplied options. See

**Returns:** Normalized link-preview metadata.

#### `hostResolvesToPrivate(hostname, dnsLookup)`

Resolve `hostname` and return `true` if ANY A/AAAA answer is a
private/reserved/loopback/link-local/metadata address — the
DNS-rebinding / resolve-to-internal defense the literal
{@link isPrivateHost} check cannot provide.

Fails CLOSED: an unresolvable or empty answer returns `true` (we
cannot prove the host is public, so we refuse it rather than hand an
unverified host to `fetch`).

```typescript
function hostResolvesToPrivate(hostname: string, dnsLookup?: HostLookup): Promise<boolean>
```

- `hostname` — Hostname to resolve and classify.
- `dnsLookup` — Injectable resolver (defaults to node:dns/promises).

**Returns:** `true` if the host resolves to a blocked address (or fails to
 *   resolve).

#### `isHostBlocked(hostname, dnsLookup)`

DNS-aware host guard used before every outbound fetch hop. Returns
`true` (block) when the host is a known-private literal/name OR
resolves to a private address. Public IP literals short-circuit
without a DNS lookup (they are already fully validated by
{@link isPrivateHost}).

```typescript
function isHostBlocked(hostname: string, dnsLookup?: HostLookup): Promise<boolean>
```

- `hostname` — Hostname extracted from the URL about to be fetched.
- `dnsLookup` — Injectable resolver (defaults to node:dns/promises).

**Returns:** `true` if the host must be blocked.

#### `isIpLiteral(hostname)`

Whether `hostname` is an IP literal (v4 or v6, optionally bracketed).
Literal IPs are fully validated by {@link isPrivateHost} and need no
DNS resolution.

```typescript
function isIpLiteral(hostname: string): boolean
```

- `hostname` — Hostname extracted from a URL.

**Returns:** `true` if `hostname` is an IP literal.

#### `isPrivateAddress(ip)`

Whether a resolved IP literal (v4, v6, or IPv4-mapped v6) is
private/internal/metadata. Dispatches by address family.

```typescript
function isPrivateAddress(ip: string): boolean
```

- `ip` — IPv4 or IPv6 literal string (e.g. a DNS answer).

**Returns:** `true` if `ip` is in a blocked range.

#### `isPrivateHost(hostname)`

Decide whether `hostname` is a private / loopback / link-local
literal (hostname or IP literal). Returns `true` if it should be
blocked.

This is the synchronous fast path — it does NOT perform DNS lookups.
For DNS-resolving protection against a public hostname that resolves
to a private address, use {@link isHostBlocked} /
{@link hostResolvesToPrivate}, which the fetcher runs before every
outbound hop.

```typescript
function isPrivateHost(hostname: string): boolean
```

- `hostname` — Hostname or IP literal extracted from a URL.

**Returns:** `true` if the hostname is a blocked literal.

#### `isPrivateIPv4(ip)`

Whether a dotted-quad IPv4 string falls in a non-routable range.

Blocks: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10 (CGNAT), 127.0.0.0/8,
169.254.0.0/16 (link-local, incl. 169.254.169.254 metadata),
172.16.0.0/12, 192.0.0.0/24, 192.168.0.0/16, 198.18.0.0/15
(benchmarking), 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved),
255.255.255.255 (broadcast).

```typescript
function isPrivateIPv4(ip: string): boolean
```

- `ip` — Dotted-quad IPv4 string.

**Returns:** `true` if `ip` is private/loopback/link-local/reserved.

#### `isPrivateIPv6(ip)`

Whether an IPv6 literal falls in a non-routable range. Blocks ::1, ::,
link-local (fe80::/10), unique-local (fc00::/7), and IPv4-mapped
private addresses in every representation.

IPv4-mapped addresses must be decoded to their embedded v4 and
re-checked — the kernel routes `::ffff:7f00:1` → `127.0.0.1`, so a
mapped literal (or a DNS answer in mapped form) is a real loopback /
metadata reach. The WHATWG URL parser normalizes
`[::ffff:169.254.169.254]` to the HEX form `::ffff:a9fe:a9fe` (never
the dotted form), and DNS can answer in hex too, so BOTH the dotted
and hex (incl. the SIIT `::ffff:0:HHHH:HHHH`) forms are decoded — and
any `::ffff:…` form we cannot parse fails CLOSED (treated as private).

```typescript
function isPrivateIPv6(ip: string): boolean
```

- `ip` — IPv6 literal (without surrounding brackets).

**Returns:** `true` if `ip` is private/loopback/link-local.

#### `parseHtml(html, finalUrl)`

Parse an HTML document into a {@link LinkPreview} record.

```typescript
function parseHtml(html: string, finalUrl: string): LinkPreview
```

- `html` — HTML body (already truncated to a safe size by the
- `finalUrl` — The final URL after redirects — used as the base

**Returns:** Normalized link-preview metadata. All fields except `url`
 *   may be `undefined`.

#### `resolveUrl(maybeRelative, baseUrl)`

Resolve a possibly-relative URL against a base URL. Returns the
absolute string, or `undefined` if it cannot be parsed.

```typescript
function resolveUrl(maybeRelative: string | undefined, baseUrl: string): string | undefined
```

- `maybeRelative` — URL string from the HTML.
- `baseUrl` — Final resolved page URL (used as the resolution

**Returns:** Absolute URL string, or `undefined`.

#### `validateUrl(rawUrl, allowPrivate)`

Validate a URL string and reject non-http(s) protocols, malformed
URLs, and (unless explicitly allowed) private-network host literals.

This is the synchronous fast-fail check. The DNS-aware guard that
rejects a public hostname resolving to a private address runs
per-hop inside {@link fetchHtml} (see {@link isHostBlocked}).

```typescript
function validateUrl(rawUrl: string, allowPrivate: boolean): URL
```

- `rawUrl` — URL string to validate.
- `allowPrivate` — If `true`, private/loopback/link-local hosts are

**Returns:** The parsed `URL` object.

### Constants

#### `DEFAULT_USER_AGENT`

Default polite, brand-neutral User-Agent. Many CDNs serve different (or
denied) markup to bare/empty UAs, so we identify ourselves as a link-preview
bot without claiming any specific product; hosts should pass their own
`userAgent` (with a contact URL/email) in production.

```typescript
const DEFAULT_USER_AGENT: "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)"
```

## Injection Notes

### Runtime Dependencies

- `undici`

Throws {@link LinkPreviewError} (`error.code` is one of
`invalid-url`, `private-network-blocked`, `unsupported-protocol`,
`http-error`, `unsupported-content-type`, `too-many-redirects`,
`timeout`, `fetch-failed`). Map `error.code` to translated user-facing
text in the calling handler — this utility intentionally has no
locale bond (handler-error pattern).

Proxied egress: Node's built-in fetch ignores HTTP_PROXY/HTTPS_PROXY. In
proxy-only environments (e.g. molecule.dev sandboxes) pass a proxy-aware
implementation via `options.fetch`, or every preview fails with
`fetch-failed`. Remember the targets are arbitrary user-submitted hosts —
an egress allowlist and this package are natural partners.
