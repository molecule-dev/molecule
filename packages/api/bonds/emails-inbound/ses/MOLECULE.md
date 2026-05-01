# @molecule/api-emails-inbound-ses

AWS SES inbound email provider — parses SNS notification payloads carrying SES inbound messages into normalized InboundEmail.

## Type
`provider`

## Implements
`@molecule/api-emails-inbound`

## Injection Notes

### Requirements
- AWS SES Inbound rule set delivering parsed/raw email content to an SNS topic that POSTs to the host application's webhook endpoint.
- An outbound `@molecule/api-emails` bond (typically `@molecule/api-emails-ses`) wired for reply dispatch.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Only SNS-delivered notifications are parsed. SES-to-S3-only flows (where the email content is fetched from S3 by the application) are out of scope for this bond — fetch the S3 object yourself and call `parseRawMimeContent` directly.
- SubscriptionConfirmation messages must be confirmed out-of-band; this bond verifies signatures but does not auto-confirm.
