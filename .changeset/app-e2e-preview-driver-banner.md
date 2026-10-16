---
'@molecule/app-e2e-preview': patch
---

The injected preview client and locator runtime now open with a short header saying what they are — molecule's test driver, injected by the preview dev server, not part of the app — and pointing at the supplied test suite (its selector/contract document and `specs/e2e/helpers/`) as the place the app's browser contract actually lives. The runtime's bytes are exported as `E2E_PREVIEW_RUNTIME_SCRIPT`, so a server that serves the bundle itself (the static-site template's dev script) serves the same script the Vite plugin does.
