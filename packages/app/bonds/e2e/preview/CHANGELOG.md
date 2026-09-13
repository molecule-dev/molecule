# @molecule/app-e2e-preview

## 1.0.4

### Patch Changes

- The dev-server plugin serves its client and runtime scripts under the app's base path as well as at the root, so a page served under a base path (`/blog/`) connects to the hub instead of loading index.html as its client script.

## 1.0.3

### Patch Changes

- The dev-server plugin injects the page client into every HTML response, not only the HTML Vite serves itself: pages an app renders from its own dev middleware (a static-site generator's post routes, an SSR handler) now connect to the hub too.
