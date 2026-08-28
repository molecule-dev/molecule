---
'@molecule/api-ai-xai': patch
---

Parse xAI's string-form error bodies (`{ code, error }`) so upstream 400 details are logged instead of a bare "HTTP 400", and surface an attachment-specific message when an image is rejected for size instead of the generic invalid-request text.
