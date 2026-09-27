# @molecule/api-ocr-tesseract

## 1.1.1

### Patch Changes

- 80b9c19: The recognize call rejects language codes other than plain Tesseract traineddata names (letters, digits and underscores joined by `+` or `-`) with a clear error, instead of passing them through to the traineddata loader.

## 1.1.0

### Minor Changes

- 3ff6ee1: New provider: self-hosted OCR with Tesseract running in your own process — no vendor account and no per-call cost.
