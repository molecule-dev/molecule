# @molecule/api-screenshots

## 1.1.3

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.1

### Patch Changes

- cdcdabb: Republished through trusted publishing; no code changes.

## 1.1.0

### Minor Changes

- 4a433f7: First release of the screenshot capture core: the `ScreenshotProvider` interface — `capture({url|html}, options)` returns PNG/JPEG bytes for a URL or an HTML string, with viewport, fullPage, format, quality, device-scale and settle-delay options — plus the `setProvider`/`capture` convenience surface for bonds.

## 1.0.0

### Minor Changes

- First release of the screenshot capture core: the `ScreenshotProvider` interface (`capture({url|html}, options) → image bytes`) with viewport, fullPage, format (png/jpeg), quality, device scale and settle-delay options, plus the `setProvider`/`capture` convenience surface for bonds.
