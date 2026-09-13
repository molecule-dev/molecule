# @molecule/app-e2e-preview

## 1.0.3

### Patch Changes

- The dev-server plugin injects the page client into every HTML response, not only the HTML Vite serves itself: pages an app renders from its own dev middleware (a static-site generator's post routes, an SSR handler) now connect to the hub too.
