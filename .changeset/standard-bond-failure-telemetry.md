---
'@molecule/api-analytics': minor
'@molecule/api-emails-mailgun': patch
'@molecule/api-emails-ses': patch
'@molecule/api-emails-resend': patch
'@molecule/api-emails-sendgrid': patch
'@molecule/api-emails-sendmail': patch
'@molecule/api-uploads-s3': patch
'@molecule/api-payments-stripe': patch
---

api-analytics gains `trackBondFailure` — the standard bond failure telemetry (`bond.failure` events, best-effort and throttled) that makes every vendor-facing bond failure queryable. The email, S3 uploads and Stripe bonds emit it at their vendor failure boundaries, including swallowed ones like a webhook handler returning null.
