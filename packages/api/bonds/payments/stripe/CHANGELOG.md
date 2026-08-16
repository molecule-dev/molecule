# @molecule/api-payments-stripe

## 1.0.3

### Patch Changes

- 8a62afc: Route Stripe calls through the outbound proxy when one is configured. The `stripe` SDK builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every call failed with a bare connection error; the client now receives a CONNECT-capable agent via the SDK's `httpAgent` option, resolved against `https://api.stripe.com` so `NO_PROXY` is honoured. Nothing is passed when no proxy is configured.
- Updated dependencies [8b35739]
  - @molecule/api-proxy-agent@1.1.0

## 1.0.2

### Patch Changes

- 49f6145: Checkout now returns the buyer to the app's `/plan-updated` page instead of the API's verify endpoint, whose host holds no session cookie (the redirect answered 401 and the plan was never granted), and the session carries `client_reference_id` + `metadata.userId` so the resulting customer can be linked to the account that paid. `createCheckoutSession` accepts `clientReferenceId`. Requires `@molecule/api-payments` ^1.1.0.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-jwt@1.0.1
  - @molecule/api-payments@1.0.1
  - @molecule/api-secrets@1.0.1
