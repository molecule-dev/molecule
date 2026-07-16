# @molecule/api-oauth

OAuth core interface for molecule.dev.

Defines the standard interface for OAuth providers.

## Quick Start

```ts
// Initiation: GET /users/oauth/:provider → 302 to the provider.
router.get('/oauth/:provider', (req, res) => {
  const state = randomToken()
  const { challenge, verifier } = pkce() // S256
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax' })
  res.cookie('oauth_verifier', verifier, { httpOnly: true, sameSite: 'lax' })
  const url = buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: 'S256' })
  if (!url) return res.status(404).json({ error: 'Provider not configured.' })
  res.redirect(url)
})

// Callback: verify state FIRST, then exchange the code SERVER-SIDE.
router.get('/oauth/:provider/callback', async (req, res) => {
  if (!req.query.state || req.query.state !== req.cookies.oauth_state) {
    return res.status(403).json({ error: 'Invalid state.' }) // CSRF guard
  }
  const props = await verifyOAuthCode(String(req.query.code), req.cookies.oauth_verifier)
  if (!props) return res.status(401).json({ error: 'OAuth verification failed.' })
  // props.emailVerified must be === true before trusting props.email over a local account.
  await logInOrLink(res, props)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-oauth
```

## API

### Interfaces

#### `OAuthAuthorizeUrlParams`

Parameters for building a provider authorization (initiation) URL —
the URL the user's browser is redirected to so the provider can
authenticate them and send back an authorization code.

```typescript
interface OAuthAuthorizeUrlParams {
  /**
   * Absolute URI the provider should redirect the user back to after
   * authorization (the app origin, optionally with a path). When omitted,
   * the builder leaves `redirect_uri` off the URL so the provider falls
   * back to its registered callback URL.
   */
  redirectUri?: string

  /**
   * The CSRF `state` parameter bound to the initiating session (stored in
   * an httpOnly cookie by the initiation endpoint and validated by the
   * login handler on callback).
   */
  state: string

  /**
   * PKCE code challenge derived (S256) from the per-session code verifier.
   * Omit only for providers that do not support PKCE.
   */
  codeChallenge?: string

  /**
   * PKCE challenge method. Always prefer `'S256'`; `'plain'` exists only
   * for providers that cannot hash.
   */
  codeChallengeMethod?: 'S256' | 'plain'
}
```

#### `OAuthProviderConfig`

Configuration for an OAuth provider.

```typescript
interface OAuthProviderConfig {
  /**
   * The OAuth server identifier.
   */
  serverName: string

  /**
   * The OAuth verification function.
   */
  verify: OAuthVerifier

  /**
   * Builds the provider authorization URL for the initiation redirect.
   * Optional for backward compatibility: bonds without it can still verify
   * codes (the app initiates some other way), but the standard
   * `GET /users/oauth/:provider` initiation endpoint requires it and
   * responds 404 for providers that lack it.
   */
  getAuthorizeUrl?: OAuthAuthorizeUrlBuilder
}
```

#### `OAuthUserProps`

The properties returned when verifying an OAuth code.

```typescript
interface OAuthUserProps {
  /**
   * An alphanumeric username derived from the OAuth provider.
   *
   * Format: `{provider_username}@{provider_name}`
   */
  username: string

  /**
   * The user's display name from the OAuth provider.
   */
  name?: string

  /**
   * The user's email address from the OAuth provider.
   */
  email?: string

  /**
   * Whether the OAuth provider has affirmatively verified that the user
   * controls this `email` mailbox.
   *
   * `true` MUST mean the provider proved mailbox ownership (e.g. Google's
   * `email_verified`, Apple's `email_verified` ID-token claim). When the
   * provider exposes no trustworthy verification signal in the profile data
   * the verifier fetched, this MUST be `false`/`undefined` (never optimistically
   * `true`) — consumers treat only an explicit `true` as verified.
   *
   * Consumers (e.g. the user resource's `logInOAuth` handler) use this to
   * decide whether a provider-supplied email may be trusted over an existing,
   * unverified local account — preventing an unverified squatter from blocking
   * the verified mailbox owner.
   */
  emailVerified?: boolean

  /**
   * The OAuth server identifier (e.g., 'github', 'google', 'twitter').
   */
  oauthServer: string

  /**
   * Unique identifier for the user from the OAuth provider.
   */
  oauthId: string

  /**
   * Raw user data from the OAuth provider.
   */
  oauthData: Record<string, unknown>
}
```

### Types

#### `OAuthAuthorizeUrlBuilder`

Builds the provider's authorization URL for OAuth initiation
(`GET /users/oauth/:provider` → 302 to this URL). Implementations embed
their own client id, scopes, and authorize endpoint so no consumer ever
hardcodes provider knowledge.

```typescript
type OAuthAuthorizeUrlBuilder = (params: OAuthAuthorizeUrlParams) => string | null
```

#### `OAuthVerifier`

Exchanges an OAuth authorization code for user profile information.

Implementations call the provider's token and user-info endpoints,
then return normalized `OAuthUserProps` for account creation or login.

Returning `null` means the provider AFFIRMATIVELY rejected the code
(e.g. GitHub's `bad_verification_code`, an expired/forged code) — the
consumer (`logInOAuth`) surfaces that as a clean 403 "verification
failed". A thrown error means an infrastructure failure (network,
provider outage) and surfaces as a 500. Implementations MUST NOT throw
for a rejected code — that would misreport a client mistake (or an
attack) as a server fault.

```typescript
type OAuthVerifier = (
  code: string,
  codeVerifier?: string,
  redirectUri?: string,
) => Promise<OAuthUserProps | null>
```

## Available Providers

| Provider | Package |
|----------|---------|
| Apple OAuth | `@molecule/api-oauth-apple` |
| GitHub OAuth | `@molecule/api-oauth-github` |
| GitLab OAuth | `@molecule/api-oauth-gitlab` |
| Google OAuth | `@molecule/api-oauth-google` |
| Microsoft OAuth | `@molecule/api-oauth-microsoft` |
| Twitter OAuth | `@molecule/api-oauth-twitter` |

## Injection Notes

The OAuth authorization-code flow has security steps a weak integration skips — these
are MANDATORY (the per-type docs carry the details):

- **`state` is CSRF protection, not optional.** On initiation, generate a random
  `state`, store it in an httpOnly cookie, and put it on the authorize URL
  ({@link OAuthAuthorizeUrlParams.state}). On callback, reject unless the returned
  `state` matches the cookie — no state check is a login-CSRF / account-takeover hole.
- **Use PKCE** ({@link OAuthAuthorizeUrlParams.codeChallenge}, method `'S256'`): derive a
  per-session code verifier, send its challenge on initiation, pass the verifier to
  {@link OAuthVerifier} on callback.
- **The code exchange is SERVER-SIDE.** {@link OAuthVerifier}`(code, …)` runs in your API
  and returns {@link OAuthUserProps} (or `null`). The OAuth **client secret** lives only
  in the API — never ship it to the browser; the browser only gets the authorize URL and
  returns the `code`.
- **Trust only `emailVerified === true`.** A provider email whose
  {@link OAuthUserProps.emailVerified} is not explicitly `true` MUST NOT take over an
  existing local account (squatter protection).

`@molecule/api-resource-user`'s `logInOAuth` already implements this flow correctly —
prefer wiring a provider bond into it over hand-rolling the endpoints.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Clicking the app's "Sign in with {provider}" button (Google, GitHub, …)
  redirects to the provider's authorize URL carrying the correct client_id,
  the app's requested scopes, AND the app's registered redirect_uri — inspect
  the actual outbound URL (the 302 Location, or the address the popup/tab
  navigates to) and confirm each value; a missing or wrong one is the bug.
- [ ] The callback route exchanges the returned code SERVER-SIDE for a token,
  fetches the profile, and creates-or-links the app user + establishes a
  session — after the round-trip the app shows that user logged in. CAVEAT:
  the provider's own consent screen runs on ITS domain and CANNOT be driven
  in the sandbox, so verify the two boundaries you DO own — the authorize URL
  going out (above) and the callback coming back — not the provider's page.
  Complete the round-trip with a test/stub provider bond if one is wired;
  otherwise assert the callback handler's own behavior (state check → code
  exchange → user create-or-link → session). Never mock the flow or edit
  production code to bypass the provider.
- [ ] A returning OAuth user logs into the SAME account — sign in twice and
  confirm one user row linked by provider id (oauthServer + oauthId), not a
  fresh duplicate created each time.
- [ ] SECURITY — the `state` parameter is generated on initiation and
  verified on callback (CSRF protection): a mismatched or absent `state` is
  rejected (403); the `redirect_uri` is validated against an allowlist so an
  attacker cannot redirect the code elsewhere; and the client secret + tokens
  stay server-side — grep the browser bundle and network tab to confirm the
  secret never reaches the client (only the authorize URL and returned code
  cross the boundary).
