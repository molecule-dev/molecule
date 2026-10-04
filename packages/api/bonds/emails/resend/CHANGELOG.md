# @molecule/api-emails-resend

## 1.0.2

### Patch Changes

- 9237172: api-analytics gains `trackBondFailure` — the standard bond failure telemetry (`bond.failure` events, best-effort and throttled) that makes every vendor-facing bond failure queryable. The email, S3 uploads and Stripe bonds emit it at their vendor failure boundaries, including swallowed ones like a webhook handler returning null.
- Updated dependencies [9237172]
  - @molecule/api-analytics@1.1.0
