# @molecule/app-feature-barcode-scanner-react

Browser barcode scanner React component using BarcodeDetector with @zxing/library fallback — for warehouse, inventory, and grocery apps

## Type
`feature`

## Injection Notes

### Requirements
- Companion locale bond: `@molecule/app-locales-feature-barcode-scanner-react`
- Camera permission must be granted by the user at runtime
- HTTPS context (or `localhost`) — `getUserMedia` is gated to secure contexts

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Native `BarcodeDetector` is currently Chromium-only — Safari and Firefox automatically fall back to the bundled `@zxing/library` decoder, which adds ~150KB to the bundle when first scanned
- The fallback path decodes one frame at a time (no continuous WASM stream) — slower than the native detector by ~2-5x
