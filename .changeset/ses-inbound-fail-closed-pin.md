---
'@molecule/api-emails-inbound-ses': minor
---

SNS webhook verification now fails closed unless an origin pin is configured: set `AWS_SES_INBOUND_TOPIC_ARN` (exact topic ARN match) or the new `AWS_SES_INBOUND_ACCOUNT_ID` (12-digit AWS account pin, read from the signing-cert URL or the signed TopicArn). Without either, verification throws a `config.notConfigured` error instead of accepting any validly-signed SNS message — a valid AWS signature alone only proves some AWS account published the notification.
