# @molecule/app-routing-solid-router

## 1.3.0

### Minor Changes

- Send signed-out visitors to the configured sign-in page when an unauthenticated GET returns 401, through `@molecule/app-routing`'s shared rule.

## 1.2.0

### Minor Changes

- Add `MemoryRouter`: Solid Router's memory router, keeping each entry's navigation state and key; the routing hooks throw an `I18nError` that names the routers to mount when the app has none.

### Patch Changes

- Requires `@solidjs/router` 0.16.1 or later, the first release that exports `RouterContext`.
- Report the location without the router's `base`, decode `getParams()` values as React Router does, and add `createHref` (the href `<A>` renders).

## 1.1.0

### Minor Changes

- Add defineRoute so Solid Router pages receive the decoded parameters declared by their path.
