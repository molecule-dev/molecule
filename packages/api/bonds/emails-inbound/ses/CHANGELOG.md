# @molecule/api-emails-inbound-ses

## 1.1.0

### Minor Changes

- c959a35: SNS webhook verification now fails closed unless an origin pin is configured: set `AWS_SES_INBOUND_TOPIC_ARN` (exact topic ARN match) or the new `AWS_SES_INBOUND_ACCOUNT_ID` (12-digit AWS account pin, read from the signing-cert URL or the signed TopicArn). Without either, verification throws a `config.notConfigured` error instead of accepting any validly-signed SNS message — a valid AWS signature alone only proves some AWS account published the notification.

## 1.0.2

### Patch Changes

- 1955dcd: Upgrades `shepherd.js` to 15.3.0 and `mailparser` to 3.9.28, the first releases of each that accept `deepmerge-ts` 8, clearing the stack-exhaustion advisory GHSA-ggr8-5vv4-36mx from both dependency chains.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-emails@1.0.1
  - @molecule/api-emails-inbound@1.0.1
  - @molecule/api-secrets@1.0.1
