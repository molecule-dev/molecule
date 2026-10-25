# @molecule/app-e2e-preview

## 1.0.12

### Patch Changes

- Clarify public API usage and configuration.

## 1.0.10

### Patch Changes

- 4760c4f: The preview client is injected into compressed HTML responses by decoding and re-encoding the body, so a page served by `vite preview` (Vite 8 compresses HTML) loads instead of failing with `net::ERR_CONTENT_DECODING_FAILED`.

## 1.0.9

### Patch Changes

- f59b814: The injected preview client and locator runtime now open with a short header saying what they are — molecule's test driver, injected by the preview dev server, not part of the app — and pointing at the supplied test suite (its selector/contract document and `specs/e2e/helpers/`) as the place the app's browser contract actually lives. The runtime's bytes are exported as `E2E_PREVIEW_RUNTIME_SCRIPT`, so a server that serves the bundle itself (the static-site template's dev script) serves the same script the Vite plugin does.

## 1.0.8

### Patch Changes

- 688af4d: `connect()` fails within 5 s when no preview page is attached, naming the cause and the `MOL_E2E_PROVIDER=playwright` alternative, and later connects in the same run fail at once (a marker beside the hub's token file) instead of waiting again per test.

## 1.0.6

### Patch Changes

- c60be91: `role=page` WebSocket upgrades are now gated like the driver side: a same-origin `Origin` check (the shipped page client connects to its own `location.host`) or the hub token is required — a cross-origin site on a dev machine can no longer connect as a page and receive/spoof driver commands and results.

## 1.0.5

### Patch Changes

- 183d661: `page.setViewportSize()` waits up to 4 seconds for the preview host to resize the frame before reporting the size it got; the real IDE resizes well after the old 1.5-second budget, which failed every phone-width spec.

## 1.0.4

### Patch Changes

- The dev-server plugin serves its client and runtime scripts under the app's base path as well as at the root, so a page served under a base path (`/blog/`) connects to the hub instead of loading index.html as its client script.

## 1.0.3

### Patch Changes

- The dev-server plugin injects the page client into every HTML response, not only the HTML Vite serves itself: pages an app renders from its own dev middleware (a static-site generator's post routes, an SSR handler) now connect to the hub too.
