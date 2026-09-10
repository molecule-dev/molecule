---
'@molecule/api-emails-mailgun': patch
'@molecule/api-emails-sendmail': patch
'@molecule/api-emails-ses': patch
'@molecule/api-utilities-smtp': patch
---

Pins nodemailer 9.1.1, fixing the four advisories against ≤9.1.0 (resolveContent bypass, IDN allow-list bypass, addressparser O(n²), RFC 5322 comment mis-parse).
