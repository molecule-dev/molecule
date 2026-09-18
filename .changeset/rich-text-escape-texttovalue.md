---
'@molecule/app-rich-text': patch
'@molecule/app-rich-text-quill': patch
---

`textToValue()` now HTML-escapes the source text when building its `.html` output, so markup in the input (e.g. `<script>`/`<img onerror>`) arrives inert in the stored HTML instead of becoming a stored-XSS payload. The plain `text` field (and Quill `delta`) is unchanged.
