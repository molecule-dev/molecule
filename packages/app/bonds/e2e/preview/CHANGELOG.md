# @molecule/app-e2e-preview

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
