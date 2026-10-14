# @molecule/api-screenshots

## 1.0.0

### Minor Changes

- First release of the screenshot capture core: the `ScreenshotProvider` interface (`capture({url|html}, options) → image bytes`) with viewport, fullPage, format (png/jpeg), quality, device scale and settle-delay options, plus the `setProvider`/`capture` convenience surface for bonds.
