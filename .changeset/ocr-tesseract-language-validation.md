---
'@molecule/api-ocr-tesseract': patch
---

The recognize call rejects language codes other than plain Tesseract traineddata names (letters, digits and underscores joined by `+` or `-`) with a clear error, instead of passing them through to the traineddata loader.
