# @molecule/app-framework-conformance

Private test kit (never published). It holds every framework binding to one contract:
**each export of `@molecule/app-react` and `@molecule/app-ui-react` exists in the Vue,
Solid, Svelte and Angular packages, renders the same DOM, and behaves the same**, so an
app moves between frameworks by rewriting its templates, not its logic, and a UI bond can
be swapped at any time.

React is the reference. A difference is a defect in the non-React package, unless React
itself is wrong; then React is fixed first and its goldens are re-recorded.

## How it is enforced

- **The kit owns the contract.** `src/ui/cases/**` describes renders in framework-neutral
  terms (`UICase`: props, children, node-valued slots, callback names, interactions, app
  context). `src/ui/goldens.json` holds React's recorded result for every case.
- **Every UI bond runs it.** Each `@molecule/app-ui-*` package has
  `src/__tests__/conformance.test.ts`, which calls `runUIConformance(adapter, { knownGaps })`
  with its own adapter (`src/__tests__/conformance/adapter.ts`). The adapter turns a case
  into that framework's idiom, mounts it in jsdom against the same bonds (the real
  `@molecule/app-ui-tailwind` ClassMap, the molecule icon set, the simple i18n provider, a
  memory router and the fakes in `src/ui/fakes.ts`), runs the interactions and returns the
  result. A package's own `npm test` (and CI) therefore fails when it drifts from React.
- **No bond can opt out.** `molecule/scripts/__tests__/framework-conformance.test.ts`
  finds every `packages/app/frameworks/*-ui` package and fails unless it has that test
  file, calls `runUIConformance`, and lists this kit in `devDependencies`. A new UI bond is
  covered the moment it exists. (`@molecule/app-ui-react-native` is exempt: it renders
  native views, not DOM.)
- **Gaps only shrink.** `known-gaps.json` lists cases a package does not match yet
  (`"(export)"` = the component is missing). Listed cases run as expected failures, so a
  listed case that starts matching fails until it is removed from the list.
- **Goldens stay true.** `src/__tests__/goldens.test.ts` (this kit's own test) re-renders
  every case in React and fails if the result differs from `goldens.json`, if a case
  logs a React error or warning, or if a `@molecule/app-ui-react` component has no cases.

A result is a normalized DOM snapshot after mount and after every interaction
(`src/ui/normalize.ts`) followed by the router location (`@route /path`), plus every
callback call and every service call (`auth.logout`, `theme.toggleMode`, …).

Equal normalized DOM means equal pixels: the same elements, attributes, class tokens,
inline styles and text, styled by the same ClassMap stylesheet, with no framework wrapper
elements and no framework-injected styles. The normalizer removes only what cannot change
rendering: comment anchors, whitespace-only text nodes, Angular compile-time attributes
(`_ngcontent-*`, `_nghost-*`, `ng-reflect-*`, `ng-version`, the `mol-*` selector
attribute) and the harness's own `data-parity-unwrap` scaffolding. Generated ids are
renumbered consistently, class tokens and style declarations are sorted (order never
affects CSS), and class tokens are stored hashed so the goldens hold no class names.

## The contract, per framework

Every UI component is exported under its React name (`Button`, `CardHeader`).

| React                          | Vue (`app-ui-vue`)                          | Solid (`app-ui-solid`)     | Svelte (`app-ui-svelte`)   | Angular (`app-ui-angular`)                 |
| ------------------------------ | ------------------------------------------- | -------------------------- | -------------------------- | ------------------------------------------ |
| data prop `variant`            | prop `variant`                              | prop `variant`             | prop `variant`             | input `variant`                            |
| `className`                    | prop `className` (Vue's `class` also works) | `className`                | `className`                | input `className` (or host `class`)        |
| `style` (camelCase object)     | `style`                                     | `style` (camelCase object) | `style` (camelCase object) | input `style` (or host `style`)            |
| `children`                     | default slot                                | `children`                 | `children` snippet         | default `<ng-content>`                     |
| node prop `leftIcon`           | `leftIcon` VNode prop or `#leftIcon` slot   | `leftIcon` JSX             | `leftIcon` snippet         | `<ng-content select="[slot=leftIcon]">`    |
| DOM callback `onClick`         | listener `onClick` / `@click`               | `onClick`                  | `onClick`                  | native `(click)` on the host               |
| other callback `onOpenChange`  | emit `openChange` (`@open-change`)          | `onOpenChange`             | `onOpenChange`             | output `openChange`                        |
| `...rest` (`aria-*`, `data-*`) | attrs fall through to the same element      | spread to the same element | spread to the same element | host attributes, moved to the same element |

Angular hosts: a component's selector names the native element React renders at its root,
as an attribute selector (`button[mol-button]`), so the host is the root element and
nothing wraps it. A component whose React root is a fragment or a portal uses an element
selector whose host is `display: contents`.

Svelte: components are real Svelte 5 `.svelte` components (runes, `$props()`), shipped as
`.svelte` files with `.svelte.d.ts` declarations.

## Running it

```bash
# in any UI package (vue-ui, solid-ui, svelte-ui, angular-ui)
npx vitest run src/__tests__/conformance.test.ts
CONFORMANCE_COMPONENTS=Button,Modal npx vitest run src/__tests__/conformance.test.ts

# in this kit: check the goldens, or re-record them after changing a case or React
npx vitest run
RECORD_GOLDENS=1 npx vitest run
```

Recording also writes readable goldens (real class names) to
`node_modules/.cache/framework-conformance/goldens.readable.json`; when that file exists,
a failing package shows a readable diff instead of hashed class tokens.

## Adding a case

Add it to the component's file under `src/ui/cases/`. Cover every prop, every variant
value, every state the component can be in, and every interaction that changes what is
rendered or calls a callback. Then `RECORD_GOLDENS=1 npx vitest run` here, and run each UI
package's conformance test: a new mismatch is either fixed in that package or added to its
`known-gaps.json`.
