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
- **No bond can opt out.** `molecule/scripts/check-framework-conformance.mjs` (run by
  `molecule/scripts/__tests__/framework-conformance.test.mjs`, which CI always runs)
  finds every package under `packages/app/frameworks/` and sorts it into its group of
  swappable bonds: `@molecule/app-ui-*` packages are UI bonds, every other package (but
  this kit) is a framework binding (see [Framework bindings](#framework-bindings)). It
  fails unless each bond has that test file, calls its group's runner
  (`runUIConformance` / `runBindingConformance`), has a `known-gaps.json`, and lists this
  kit in `devDependencies`. It also fails on a static `class="…"` or a Svelte `class:`
  directive in a UI bond's `.svelte`, `.vue` or `.html` markup (ESLint does not parse
  those). A new bond is covered the moment it exists. Exempt: the two React references,
  `@molecule/app-ui-react-native` (it renders native views, not DOM) and
  `@molecule/app-react-native` (it re-exports `@molecule/app-react` unchanged).
- **Gaps only shrink.** `known-gaps.json` lists cases a package does not match yet
  (`"(export)"` = the component is missing). Listed cases run as expected failures, so a
  listed case that starts matching fails until it is removed from the list.
- **Every export exists.** `goldens.json` also lists every `@molecule/app-ui-react` export
  (components, compound parts, hooks, utilities); each package's run checks that it exports
  each one under the same name.
- **Goldens stay true.** `src/__tests__/goldens.test.ts` (this kit's own test) re-renders
  every case in React and fails if the result differs from `goldens.json`, if a case
  logs a React error or warning, if the recorded export list differs from React's, or if
  a `@molecule/app-ui-react` export is rendered by no case (as the root, nested in a
  child, slot or node-valued prop, or called by a probe; `cn` is the one exception, a
  re-export of `@molecule/app-ui`'s class joiner).

A result is a normalized DOM snapshot after mount and after every interaction
(`src/ui/normalize.ts`) followed by the router location (`@route /path`, with
` state=<json>` when the history entry carries state, `key` fields dropped) and the focused
element (`@focus body>div:0>button:1`), plus every callback call and every service call
(`auth.logout`, `theme.toggleMode`, …).

Equal normalized DOM means equal pixels: the same elements, attributes, class tokens,
inline styles and text, styled by the same ClassMap stylesheet, with no framework wrapper
elements and no framework-injected styles. The normalizer removes only what cannot change
rendering: comment anchors, Angular compile-time attributes (`_ngcontent-*`, `_nghost-*`,
`ng-reflect-*`, `ng-version`, the `mol-*` selector attribute), the harness's own
`data-parity-unwrap` scaffolding, and whitespace that does not draw. Class tokens and
style declarations are sorted (order never affects CSS), and class tokens are stored hashed
so the goldens hold no class names.

- **Text** is compared as it renders: adjacent text nodes are merged (`'One'` + `'Two'`
  is `'OneTwo'`), and whitespace is kept exactly where CSS draws it, read from computed
  style under the reference stylesheet (`@import 'tailwindcss'` plus
  `@molecule/app-ui-tailwind/base.css`, compiled for the classes in the DOM,
  `src/ui/stylesheet.ts`). Inside a flex or grid container every text run is trimmed;
  elsewhere whitespace is dropped at the start and end of an element's content and next to
  a block-level sibling, and kept as one space between text and an inline element
  (`<strong>12</strong> unread`) or between two inline elements. The stylesheet is in the
  document only while a snapshot is normalized, so components never see it.
- **Ids**: generated ids are renumbered in order of appearance (`#id0`), together with
  every attribute that references them, so `:r1:` and `v-0` compare equal. A reference
  to an id no element carries (an inactive tab's `aria-controls`) becomes `#ref0`, unless
  the case wrote that id itself (a Label's `htmlFor`), which stays verbatim.

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

## Writing cases

A case (`UICase`, `src/ui/spec.ts`) is plain data, so every framework reads the same one:

| Field / marker                                          | Meaning                                                                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `props`                                                 | data props, by React name                                                                                                   |
| `children`, `slots`                                     | node lists: strings, `{ tag, attrs, children }`, `{ component, props, children, slots }`                                    |
| `{ $nodes: [...] }` inside a prop                       | a node-valued prop (`leftIcon`, `items[0].icon`); each adapter builds its own node type                                     |
| `{ $fn, returns }` / `{ $fn, format: '{0}: {1.name}' }` | a plain function prop (`rowKey`, `goToPage`); `format` interpolates the call's arguments                                    |
| `{ $fn, nodes: [...] }`                                 | a render function (`columns[0].render`); string nodes interpolate `{0}`, `{1.field}`                                        |
| `{ probe: 'useToast', method, args, label }`            | a button that calls a UI-package hook on click (`useToast().addToast(...)`)                                                 |
| `{ probe, value: true, label }`                         | the same button showing the hook's current value as `data-parity-value` (JSON)                                              |
| `callbacks`, `callbackResults`                          | callback props to record, and what each returns: `returns`, `resolve`, `reject`, or `defer` (pending until a `settle` step) |
| `context`                                               | app state: auth status/user, theme mode, initial route, locale                                                              |
| `viewportWidth`, `fakeTimers`                           | `matchMedia` width; fake timers for `advance` steps                                                                         |

Interactions: `click`, `dblclick`, `focus`, `blur`, `mouseenter`, `mouseleave`, `pointerdown`,
`keydown`, `input`, `check`, `submit`, `event` (any DOM event on a selector, `window` or
`document`), `props` (re-render with new props), `advance` (timers), `settle` (a deferred
callback), `navigate` (the router, from outside).

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

## Framework bindings

The same contract holds the framework bindings (`@molecule/app-vue`, `-solid`, `-svelte`,
`-angular`) to `@molecule/app-react`'s hooks (`src/bindings/`, imported from
`@molecule/app-framework-conformance/bindings`).

- **Required exports:** every `@molecule/app-react` export except the `*Context` objects
  and `*Provider` components. Those are the composition root, the one place an app changes
  when it swaps framework (Vue `moleculePlugin`, Solid `MoleculeProvider config`, Svelte
  `setMoleculeContext`, Angular `provideMolecule`).
- **Cases:** `src/bindings/cases/**`, one `HookCases` per export. React's results live in
  `src/bindings/goldens.json`. `src/__tests__/bindings-goldens.test.ts` re-runs every case
  in React and fails on a stale golden, a React error or warning, a required export with
  no case family, or two families for one export.
- **Each binding package** calls `runBindingConformance(adapter, { knownGaps })` from
  `src/__tests__/conformance.test.ts`, with its adapter in
  `src/__tests__/conformance/binding-adapter.ts`.
- **A result** is, after mount and after every step, the hook's result read under React's
  shape (value fields normalized, methods as `'[method]'`) plus the router location; then
  every service call (`auth.login`, `http.get`, `storage.set`, …), every call of a
  function argument, every method outcome (`=> login` with `returned`, `threw`,
  `resolved` or `rejected`), and the subscriptions each service still holds after unmount.

| React                            | Vue (`app-vue`)                        | Solid (`app-solid`)                     | Svelte (`app-svelte`)                      | Angular (`app-angular`)                              |
| -------------------------------- | -------------------------------------- | --------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `useAuth()` in a component       | `useAuth()` in `setup`                 | `useAuth()` in a component              | `useAuth()` during component init          | `useAuth()` in an injection context                  |
| services from `MoleculeProvider` | `app.use(moleculePlugin, …)`           | `<MoleculeProvider config={…}>`         | `setMoleculeContext({…})`                  | `provideMolecule({…})`                               |
| value field `user`               | value or `Ref`                         | value or accessor `() => user`          | value or store (`$user`)                   | value or signal                                      |
| method `login`                   | function                               | function                                | function                                   | function                                             |
| component `SessionReady`         | component, slots `default`, `fallback` | component, props `children`, `fallback` | component, snippets `children`, `fallback` | component, default `<ng-content>`, `[slot=fallback]` |

An `args` step re-renders React with new arguments; the other adapters re-mount the host,
since a composable, primitive or injection runs once per mount. A family marked
`reactiveArgs` (`useChat`, whose app re-renders it with a new `endpoint` to switch
conversation) is the exception: its options arrive as the framework's reactive value (Vue a
ref, Solid an accessor, Svelte a readable store, Angular a signal), the binding follows it,
and an `args` step sets it on the same mount.

Writing binding cases (`HookCase`, `src/bindings/spec.ts`):

| Field / marker                                           | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `args`                                                   | the hook's arguments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `{ $fn, returns \| resolve \| reject \| defer \| pick }` | a recorded function argument; `defer` stays pending until a `settle` step; `pick: [0, 'count']` returns `args[0].count` (a selector)                                                                                                                                                                                                                                                                                                                                                                          |
| `{ $ref: 'async.form' }`                                 | an object an area fakes module exposes (a form controller a case cannot write as data)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `context`                                                | `auth`, `authErrors`, `http` (scripted responses, `defer`), `storage`, `translations`, `routes`, `theme`, `locale`, `route`, `areas`, `omitServices` (mount without a provider: a throwing hook records `{ $threw }`)                                                                                                                                                                                                                                                                                         |
| `steps`                                                  | `call` (a dotted `method` such as `0.cancel` reaches into the result, `as` keeps its result, `on` calls a method of a kept one), `stable` (is a method, or with no `methods` the result itself, the same function as at the previous `stable`), `args`, `advance`, `settle`, `http`, `auth`, `locale`, `theme`, `navigate`, `storage`, `control`, `unmount`, `remount` (a fresh host over the same services and fakes); a rejected `auth`, `locale`, `theme`, `navigate` or `storage` step records `! <step>` |
| `render: 'text'` on `HookCases`                          | the export is a component: string props are text slots and the result is the text it renders                                                                                                                                                                                                                                                                                                                                                                                                                  |

Area fakes (`src/bindings/fakes/<area>.ts`) add what one group of hooks needs beyond the
shared services: extra services (chat, workspace, editor, preview), bonded providers set for
one case and restored after it, `control` actions (`chat.emit`), `$ref` objects and
listener counts.

```bash
# in any binding package (vue, solid, svelte, angular)
npx vitest run src/__tests__/conformance.test.ts
CONFORMANCE_HOOKS=useAuth,useForm npx vitest run src/__tests__/conformance.test.ts

# in this kit, while writing cases: run them in React only, and see what React produced
CONFORMANCE_HOOKS=useAuth CONFORMANCE_SKIP_GOLDENS=1 CONFORMANCE_DUMP=/tmp/react.json npx vitest run src/__tests__/bindings-goldens.test.ts
```
