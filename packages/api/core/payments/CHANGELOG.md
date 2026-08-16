# @molecule/api-payments

## 1.1.0

### Minor Changes

- 49f6145: Adds `resolveCheckoutRedirectUrls` and `resolveBillingPortalReturnUrl`, which build the URLs a hosted checkout or billing portal returns the buyer to from the APP origin (`APP_ORIGIN`/`ORIGIN`) — configurable with `PAYMENTS_PLAN_UPDATED_PATH`, `PAYMENTS_CHECKOUT_CANCEL_PATH` and `PAYMENTS_BILLING_RETURN_PATH`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
