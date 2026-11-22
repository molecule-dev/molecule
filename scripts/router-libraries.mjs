/**
 * The router libraries, and the only places that depend on one.
 *
 * Every app package reads the router through its framework binding (`useLocation`,
 * `useNavigate`, `Link`, `RoutedView` from `@molecule/app-react`, `-vue`, `-svelte`, `-solid` or
 * `-angular`), so it works under every routing bond, and an app swaps its router by swapping
 * the bond. Only a routing bond imports a router library, and a composition root
 * (`packages/app/infrastructure/bonds-default-*`) that wires one beside the framework's own
 * route config. `eslint.config.js` holds imports to this, and `check-framework-conformance.mjs`
 * holds package manifests to it.
 *
 * @module
 */

/** Package directories (repo-relative, trailing slash) that may depend on a router library. */
export const ROUTER_LIBRARY_OWNERS = ['packages/app/bonds/routing/', 'packages/app/infrastructure/']

/** Router library packages, as a package.json names them. */
export const ROUTER_LIBRARY_PACKAGES = [
  'react-router',
  'react-router-dom',
  'vue-router',
  '@solidjs/router',
  '@angular/router',
  'next',
  '@sveltejs/kit',
  '@tanstack/react-router',
  '@react-navigation/native',
]

/** Router library import specifiers, as `no-restricted-imports` patterns (gitignore syntax). */
export const ROUTER_LIBRARY_IMPORTS = [
  'react-router',
  'react-router/*',
  'react-router-dom',
  'react-router-dom/*',
  'vue-router',
  'vue-router/*',
  '@solidjs/router',
  '@solidjs/router/*',
  '@angular/router',
  '@angular/router/*',
  'next/navigation',
  'next/link',
  'next/router',
  '$app/navigation',
  '$app/paths',
  '$app/state',
  '$app/stores',
  '@tanstack/react-router',
  '@tanstack/react-router/*',
  '@react-navigation/*',
]

/** What to do instead, for the lint message and the manifest check. */
export const ROUTER_LIBRARY_FIX =
  "Read the router through the framework binding (useLocation, useNavigate, Link, RoutedView from @molecule/app-react, -vue, -svelte, -solid or -angular), so the package works under every routing bond; only a routing bond (packages/app/bonds/routing) uses a router library. A test mounts the core router: createMemoryRouter from @molecule/app-routing under the binding's RouterProvider."
