# @molecule/app-routing-angular-router

## 1.3.0

### Minor Changes

- Send signed-out visitors to the configured sign-in page when an unauthenticated GET returns 401, through `@molecule/app-routing`'s shared rule.

## 1.2.0

### Minor Changes

- Add `createHref`: the href `routerLink` renders, with the `APP_BASE_HREF` base.

### Patch Changes

- The routing hooks throw an `I18nError` that names how to install the router when the app has none.

## 1.1.0

### Minor Changes

- Add defineRoute and injectRouteParams so Angular pages read the parameters declared by their path.
