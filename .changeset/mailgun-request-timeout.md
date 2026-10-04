---
'@molecule/api-emails-mailgun': patch
---

The Mailgun transport now has a request timeout (10 s, overridable), so a stalled send fails instead of hanging.
