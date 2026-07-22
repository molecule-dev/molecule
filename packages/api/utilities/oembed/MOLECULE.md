# @molecule/api-oembed

oEmbed consumer.

Resolves a URL into a normalized
`{ type, version, title?, author_name?, provider_name?,
thumbnail_url?, html?, width?, height?, ... }` payload by either:

1. Using a built-in provider registry (YouTube, Vimeo, Twitter/X,
   SoundCloud, Spotify, Codepen) to skip HTML discovery for popular
   providers, OR
2. Fetching the target page and discovering the oEmbed endpoint via
   `<link rel="alternate" type="application/json+oembed">`.

Used by blog (rich-link cards), discussion-boards, and productivity
apps (Notion-style embeds).

Built-in safety:

- SSRF guard refuses private/loopback/link-local hosts by default
  on every URL — input, redirects, AND the discovered oEmbed
  endpoint.
- The SSRF guard is DNS-aware: it resolves each host before fetching
  and rejects it if any A/AAAA record lands in a private/internal/
  metadata range, so a public hostname that resolves to a private
  address (DNS-rebinding / resolve-to-internal) is caught — not just
  IP/host literals. On the default fetch path the connection is pinned
  to the validated address (no check-then-connect rebind window); an
  injected `options.fetch` is still resolve-validated but owns its own
  transport, so for a hard guarantee there also restrict egress at the
  network layer.
- HTML sanitization on `OEmbedResponse.html` strips `<script>`
  blocks, `on*=` event handlers, and `javascript:` URLs.
- Manual redirect handling re-validates each hop.
- Hard timeout (default 5s) via `AbortController`.
- Body-size cap (default 256 KiB for JSON, 1 MiB for HTML
  discovery).

Pure HTTP fetch — no DOM, no headless browser. Works in any Node ≥
20 runtime that ships `fetch`.

## Quick Start

```ts
import { oembed } from '@molecule/api-oembed'

const embed = await oembed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
// → { type: 'video', version: '1.0', title, html, width, height, ... }
```

```ts
// With a @molecule/api-cache-compatible adapter:
const embed = await oembed(url, {
  cache: myCacheAdapter,
  cacheTtlMs: 600_000,
  timeoutMs: 3_000,
  maxWidth: 640,
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-oembed undici
```

## API

### Interfaces

#### `FetchedText`

Result of a successful {@link fetchText} call.

```typescript
interface FetchedText {
  /**
   * Truncated body bytes decoded as UTF-8 text.
   */
  body: string

  /**
   * Final URL after redirects.
   */
  finalUrl: string

  /**
   * Lowercased response content-type prefix (e.g. `text/html`,
   * `application/json`).
   */
  contentType: string
}
```

#### `FetchTextOptions`

Fetch options passed through {@link fetchText}.

```typescript
interface FetchTextOptions extends Pick<
  OEmbedOptions,
  'fetch' | 'userAgent' | 'timeoutMs' | 'maxBodyBytes' | 'maxRedirects' | 'allowPrivateNetworks'
> {
  /**
   * Comma-separated `Accept` header value sent with the request.
   * Defaults to `*\/\*` so the same fetcher works for HTML discovery
   * and JSON oEmbed retrieval.
   */
  accept?: string

  /**
   * Allowed content-type prefixes. The response is rejected if its
   * `content-type` doesn't start with one of these. Pass `undefined`
   * to skip the check.
   */
  acceptedContentTypes?: string[]
}
```

#### `OEmbedCache`

Minimal cache contract — compatible with `@molecule/api-cache`
providers. Only `get`/`set` of string keys to JSON-serializable
values is required.

```typescript
interface OEmbedCache {
  /**
   * Get a previously cached response, or `undefined` if not present.
   */
  get(key: string): Promise<OEmbedResponse | undefined> | OEmbedResponse | undefined

  /**
   * Set a response with an optional TTL in milliseconds.
   */
  set(key: string, value: OEmbedResponse, ttlMs?: number): Promise<void> | void
}
```

#### `OEmbedOptions`

Options for {@link oembed}.

```typescript
interface OEmbedOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`.
   * Useful for tests, custom retry/timeout logic, or running behind an
   * HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * `User-Agent` header sent with the request. Defaults to a polite
   * descriptive UA.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number

  /**
   * Maximum response body size in bytes that will be parsed. Defaults
   * to 262_144 (256 KiB). oEmbed JSON payloads are tiny in practice;
   * the cap keeps a hostile server from feeding us a 10 GB stream.
   */
  maxBodyBytes?: number

  /**
   * Maximum number of redirects to follow during discovery + fetch.
   * Defaults to 5.
   */
  maxRedirects?: number

  /**
   * Optional cache. When provided, successful responses are cached
   * under the input URL.
   */
  cache?: OEmbedCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 600_000 (10
   * minutes). Only applied when {@link OEmbedOptions.cache} is set.
   */
  cacheTtlMs?: number

  /**
   * SSRF guard — when `false` (the default) requests to private /
   * loopback / link-local IP ranges are refused, including hosts that
   * resolve to such an address (DNS-aware). Set `true` to allow them
   * (for example in an internal-network embed scraper). Use with care.
   */
  allowPrivateNetworks?: boolean

  /**
   * Override or extend the built-in provider registry. Entries here
   * are tried BEFORE the built-ins, so callers can short-circuit a
   * built-in entry by registering an entry with an overlapping match.
   */
  providers?: OEmbedProvider[]

  /**
   * Optional `maxwidth` parameter forwarded to providers — most
   * providers honor this to scale embedded media.
   */
  maxWidth?: number

  /**
   * Optional `maxheight` parameter forwarded to providers.
   */
  maxHeight?: number
}
```

#### `OEmbedProvider`

Map of provider URL patterns → oEmbed endpoints. Used as an
optimization to skip HTML discovery for popular providers (YouTube,
Twitter/X, Vimeo, Spotify, SoundCloud, Codepen).

Each entry's `match` is tested against the input URL string with
`RegExp.test`. The first match wins. The `endpoint` URL has the
resource URL appended as a `url` query parameter, so it should NOT
include a trailing `?url=`.

```typescript
interface OEmbedProvider {
  /**
   * Provider display name — e.g. `"YouTube"`.
   */
  name: string

  /**
   * Regex tested against the input URL. The first matching provider
   * wins, so order entries from most-specific to least-specific.
   */
  match: RegExp

  /**
   * Provider oEmbed endpoint URL — the input URL is appended as a
   * `url` query parameter at request time.
   */
  endpoint: string
}
```

#### `OEmbedResponse`

Normalized oEmbed response. Mirrors the
[oEmbed 1.0 spec](https://oembed.com/) — all fields except `type`
and `version` are optional. The `html` field has been sanitized
before being placed on the result (no `<script>` tags or `on*`
attribute handlers).

```typescript
interface OEmbedResponse {
  /**
   * Resource type — one of `photo`, `video`, `link`, `rich`.
   */
  type: OEmbedType

  /**
   * oEmbed format version. Always `"1.0"` for compliant providers.
   */
  version: string

  /**
   * Resource title.
   */
  title?: string

  /**
   * Author display name.
   */
  author_name?: string

  /**
   * Author homepage / profile URL.
   */
  author_url?: string

  /**
   * Provider display name (e.g. `"YouTube"`, `"Spotify"`).
   */
  provider_name?: string

  /**
   * Provider homepage URL.
   */
  provider_url?: string

  /**
   * Suggested cache duration in seconds.
   */
  cache_age?: number

  /**
   * Thumbnail image URL.
   */
  thumbnail_url?: string

  /**
   * Thumbnail width in pixels.
   */
  thumbnail_width?: number

  /**
   * Thumbnail height in pixels.
   */
  thumbnail_height?: number

  /**
   * Width of the embedded resource in pixels (`photo`, `video`, `rich`).
   */
  width?: number

  /**
   * Height of the embedded resource in pixels (`photo`, `video`, `rich`).
   */
  height?: number

  /**
   * Direct image URL (`photo` type only).
   */
  url?: string

  /**
   * Sanitized embed HTML (`video` and `rich` types). Never contains
   * `<script>` tags or `on*` event-handler attributes — see
   * {@link sanitizeHtml}.
   */
  html?: string

  /**
   * Provider-specific extensions. Keys outside the oEmbed spec are
   * preserved here so consumers can opt into them on a per-provider
   * basis.
   */
  [key: string]: unknown
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

#### `OEmbedErrorCode`

Stable error codes emitted by {@link OEmbedError}.

```typescript
type OEmbedErrorCode =
  | 'invalid-url'
  | 'private-network-blocked'
  | 'unsupported-protocol'
  | 'http-error'
  | 'unsupported-content-type'
  | 'too-many-redirects'
  | 'timeout'
  | 'fetch-failed'
  | 'no-oembed-endpoint'
  | 'invalid-oembed-payload'
```

#### `OEmbedType`

Discriminator for {@link OEmbedResponse}. Per spec, the four valid
types are `photo`, `video`, `link`, and `rich`.

```typescript
type OEmbedType = 'photo' | 'video' | 'link' | 'rich'
```

### Classes

#### `OEmbedError`

Error thrown when {@link oembed} cannot produce a normalized
response. `code` is a stable machine-readable string; `message` is
the developer-facing English description (handler-error pattern —
locale bond not required for this utility).

### Functions

#### `buildProviderEndpoint(provider, targetUrl, maxWidth, maxHeight)`

Build the final oEmbed endpoint URL for `provider` + `targetUrl`,
appending the `url`, `maxwidth`, and `maxheight` query parameters
as necessary.

```typescript
function buildProviderEndpoint(provider: OEmbedProvider, targetUrl: string, maxWidth?: number, maxHeight?: number): string
```

- `provider` — Matched provider entry.
- `targetUrl` — The URL to be embedded.
- `maxWidth` — Optional `maxwidth` parameter.
- `maxHeight` — Optional `maxheight` parameter.

**Returns:** Fully-formed oEmbed endpoint URL.

#### `discoverOembedUrl(html, baseUrl)`

Find the JSON oEmbed discovery URL inside an HTML document.

Looks for the first
`<link rel="alternate" type="application/json+oembed" href="...">`
tag in the `<head>` region. The XML variant
(`type="text/xml+oembed"`) is intentionally ignored — this consumer
only speaks JSON.

```typescript
function discoverOembedUrl(html: string, baseUrl: string): string | undefined
```

- `html` — HTML body.
- `baseUrl` — Final URL of the page (for relative `href` resolution).

**Returns:** Absolute oEmbed discovery URL, or `undefined` if not present.

#### `fetchText(inputUrl, options)`

Fetch the body of `url` with manual redirect handling, total
timeout, and body-size cap. Returns the truncated body, final URL,
and content-type.

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
function fetchText(inputUrl: string, options?: FetchTextOptions): Promise<FetchedText>
```

- `inputUrl` — URL to fetch.
- `options` — Fetch options.

**Returns:** Truncated body + final URL + content-type.

#### `findProvider(url, providers)`

Find the first matching provider for `url` from `providers`,
falling back to {@link builtinProviders}. Caller-supplied entries
are tested BEFORE built-ins so consumers can override defaults.

```typescript
function findProvider(url: string, providers?: OEmbedProvider[]): OEmbedProvider | undefined
```

- `url` — URL to embed.
- `providers` — Optional caller-supplied provider list. Tested before the built-ins.

**Returns:** The first matching provider, or `undefined` if none match.

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

**Returns:** `true` if the host resolves to a blocked address (or fails to resolve).

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

#### `oembed(url, options)`

Discover and fetch the normalized oEmbed payload for `url`.

Resolution strategy:

1. Validate `url` (protocol + SSRF guard).
2. If a built-in or caller-supplied provider matches, use that
   provider's oEmbed endpoint directly — skips HTML discovery.
3. Otherwise, fetch the HTML and look for a
   `<link rel="alternate" type="application/json+oembed">` tag.
4. Fetch the discovered endpoint, validate the JSON payload, and
   sanitize any embedded `html`.

Honors:

- SSRF guard — rejects private/loopback/link-local hosts, and hosts
  that RESOLVE to such addresses (DNS-aware), unless
  `allowPrivateNetworks: true` is passed (applies to the input
  URL, every redirect hop, AND the discovered oEmbed endpoint).
- Manual redirect following with per-hop SSRF re-validation.
- Total per-request timeout via `AbortController` (default 5s).
- Body-size cap (default 256 KiB for oEmbed JSON; HTML discovery
  uses the same cap).
- HTML sanitization — `<script>` blocks and `on*=` attributes are
  stripped from the returned `html` field; `javascript:` URLs are
  neutralized.
- Optional response cache (`@molecule/api-cache`-compatible).

Locale bonds are intentionally not used — error messages on the
thrown {@link OEmbedError} are developer-facing English (handler-
error pattern). Consumers should map `error.code` to translated
user-facing strings in the calling handler.

```typescript
function oembed(url: string, options?: OEmbedOptions): Promise<OEmbedResponse>
```

- `url` — URL to embed. Must be `http:` or `https:`.
- `options` — Caller-supplied options. See {@link OEmbedOptions}.

**Returns:** Normalized {@link OEmbedResponse}.

#### `sanitizeHtml(html)`

Strip dangerous constructs from an oEmbed `html` payload.

Removes:

- `<script>...</script>` blocks (any case, with or without
  attributes).
- Self-closing `<script ... />` and unclosed `<script ...>` tags.
- `on*=` event-handler attributes (`onclick`, `onload`, …) on any
  element, regardless of quoting style.
- `javascript:` URLs in `href` and `src` attributes.

```typescript
function sanitizeHtml(html: string): string
```

- `html` — Raw HTML from an oEmbed response.

**Returns:** Sanitized HTML safe to render.

#### `validateUrl(rawUrl, allowPrivate)`

Validate a URL string. Rejects non-http(s) protocols, malformed
URLs, and (unless explicitly allowed) private-network host literals.

This is the synchronous fast-fail check. The DNS-aware guard that
rejects a public hostname resolving to a private address runs
per-hop inside {@link fetchText} (see {@link isHostBlocked}).

```typescript
function validateUrl(rawUrl: string, allowPrivate: boolean): URL
```

- `rawUrl` — URL string to validate.
- `allowPrivate` — If `true`, private/loopback/link-local hosts are permitted.

**Returns:** The parsed `URL` object.

### Constants

#### `builtinProviders`

Built-in provider table. Order matters: more-specific entries (e.g.
`youtu.be` before `youtube.com`) appear first.

```typescript
const builtinProviders: OEmbedProvider[]
```

#### `DEFAULT_USER_AGENT`

Default polite, brand-neutral User-Agent — matches the link-preview
convention. Identifies the request as an oEmbed fetcher without claiming any
specific product; hosts should pass their own `userAgent` (with a contact
URL/email) in production.

```typescript
const DEFAULT_USER_AGENT: "Mozilla/5.0 (compatible; oEmbedBot/1.0)"
```

## Injection Notes

### Runtime Dependencies

- `undici`

Throws {@link OEmbedError} (`error.code` is one of `invalid-url`,
`private-network-blocked`, `unsupported-protocol`, `http-error`,
`unsupported-content-type`, `too-many-redirects`, `timeout`,
`fetch-failed`, `no-oembed-endpoint`, `invalid-oembed-payload`).
Map `error.code` to translated user-facing text in the calling
handler — this utility intentionally has no locale bond
(handler-error pattern).

Proxied egress: Node's built-in fetch ignores HTTP_PROXY/HTTPS_PROXY. In
proxy-only environments (e.g. molecule.dev sandboxes) pass a proxy-aware
implementation via `options.fetch`, or every resolution fails with
`fetch-failed`. Remember the targets are arbitrary user-submitted hosts —
an egress allowlist and this package are natural partners.
