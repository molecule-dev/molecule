# @molecule/app-auth-shell-react

`@molecule/app-auth-shell-react` — centered glassmorphic shell for
auth pages (Login, Signup, ForgotPassword, ResetPassword).

Apps pass per-app `decoration` (orbs, gradient backdrop) and
`brand` (logo + tagline) as ReactNode props. The shell handles
layout, the glass card, heading/subheading, body slot, footer,
and the "Back to home" link.

The shell also wraps its content in an `<AuthFormStateProvider>`, so
any form rendered inside inherits cross-view email persistence — the
email typed on one auth view (Login/Signup/Forgot/Reset) is carried to
the next and cleared on successful auth. Forms read it via
`useAuthFormStateContext()`; the underlying `useAuthFormState` hook is
also exported for standalone use. Persistence flows through the
`@molecule/app-storage` `StorageProvider` abstraction (never raw
`sessionStorage`), defaulting to a process-shared in-memory store.

## Quick Start

```tsx
import { AuthShell, useAuthFormStateContext } from '@molecule/app-auth-shell-react'
import { createSessionStorageProvider } from '@molecule/app-storage-localstorage'
import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Orbs } from './Orbs.js'

const sessionStore = createSessionStorageProvider({ prefix: 'auth_' })

function LoginForm() {
  const { fields, setField, clear } = useAuthFormStateContext()
  // bind <input value={fields.email} onChange={(e) => setField('email', e.target.value)} />
  // call clear() after a successful sign-in
}

export function Login() {
  return (
    <AuthShell
      heading="Sign in"
      subheading="Welcome back."
      brand={<AuthBrandHeader />}
      decoration={<Orbs />}
      formStateStorage={sessionStore}
      footer={<p>No account? <Link to="/signup">Sign up</Link></p>}
    >
      <LoginForm />
    </AuthShell>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-shell-react
```

## API

### Interfaces

#### `AuthFormFields`

Shared auth form field values. `email` is the canonical cross-view
field; additional string fields (e.g. a name carried from Signup) may
be stored alongside it.

```typescript
interface AuthFormFields {
  /** Email address, shared across all auth views. */
  email?: string
  /** Any other shared string field (e.g. `name`). */
  [field: string]: string | undefined
}
```

#### `AuthFormState`

The value returned by {@link useAuthFormState} (and provided through
the AuthShell form-state context).

```typescript
interface AuthFormState {
  /** Current field values (email + any shared fields). */
  fields: AuthFormFields
  /**
   * `true` once the initial read from storage has completed. Useful for
   * deferring autofocus/validation until persisted values are loaded.
   */
  hydrated: boolean
  /** Sets a single field and persists the new state. */
  setField: (name: string, value: string) => void
  /** Merges a patch of fields and persists the new state. */
  setFields: (patch: AuthFormFields) => void
  /**
   * Clears all persisted auth form state and removes the storage key.
   * Call this from the successful-auth handler.
   */
  clear: () => void
}
```

#### `AuthFormStateProviderProps`

Props for {@link AuthFormStateProvider}.

```typescript
interface AuthFormStateProviderProps {
  children: ReactNode
  /** Storage provider backing persistence (defaults to a shared in-memory provider). */
  storage?: StorageProvider
  /** Storage key for the persisted fields. */
  storageKey?: string
  /** Seed values used before hydration / when storage is empty. */
  initialFields?: AuthFormFields
}
```

#### `AuthShellBackLinkProps`

"Back to home" link (or custom destination) rendered below the card.

```typescript
interface AuthShellBackLinkProps {
  to?: string
  /** Translated label override; falls back to `auth.backHome` → "Back to home". */
  label?: string
}
```

#### `AuthShellCardColumnProps`

A `<section>` (or `<main>`, via `as`) that centers its children on
both axes — the form-card half of `<AuthShellSplit>`, or the centered
content column of a header / main / footer stacked auth layout.
Provides only the `flex` centering; pass `className` for width ratio,
padding, and `flex-1`.

```typescript
interface AuthShellCardColumnProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Cosmetic classes — width ratio, padding. */
  className?: string
  /**
   * Element to render. Defaults to `'section'`; pass `'main'` when the
   * card column is the auth page's primary content landmark — i.e. the
   * shell is not already wrapped in `<AuthShellSplitRow>` (which is
   * itself a `<main>`, so nesting another would be invalid).
   */
  as?: 'section' | 'main'
}
```

#### `AuthShellCardProps`

The centered glassmorphic card surface. Layout (flex column + padding)
is fixed; the visible surface (rounded / bg / border / shadow) is the
default glass treatment, replaceable per-app via `surfaceClassName`.

Pass `outerClassName` to override the outer `<main>` width / max-width
constraint (default `max-w-md`).

```typescript
interface AuthShellCardProps {
  children: ReactNode
  /** Override the default glass surface (rounded + bg + border + shadow). */
  surfaceClassName?: string
  /** Extra layout classes to append (after flex/padding defaults). */
  className?: string
  /** Override the outer `<main>` wrapper classes (defaults to `cm.w('full') max-w-md relative z-10`). */
  outerClassName?: string
  /** data-mol-id pass-through for E2E selectors. */
  dataMolId?: string
  style?: CSSProperties
}
```

#### `AuthShellContainerProps`

Outer full-screen container — centered Flex, padded, with optional
absolute-positioned background decoration child.

Compose with `<AuthShellCard>` (and friends) inside.

```typescript
interface AuthShellContainerProps {
  children: ReactNode
  /** Optional CSS background applied to the container. */
  style?: CSSProperties
  /** Optional extra className appended after defaults. */
  className?: string
  /** Layout direction. Defaults to centered-Flex; pass `'column'` for a vertical stack (top-bar / main / footer). */
  layout?: 'centered' | 'column'
}
```

#### `AuthShellHeadingProps`

Heading block — optional eyebrow + h1 + optional subheading. All centered.

```typescript
interface AuthShellHeadingProps {
  heading: string
  subheading?: string
  /** Optional small uppercase tag rendered above the heading. */
  eyebrow?: string
  /** Optional override for the h1 className (e.g. custom font-family). */
  headingClassName?: string
  /** Optional override for the h1 style. */
  headingStyle?: CSSProperties
}
```

#### `AuthShellPanelProps`

A decorative `<aside>` that collapses on mobile (`hidden lg:flex`, the
one universally-shared concern) — the brand-panel half of
`<AuthShellSplit>`, or the decorative column of any grid-based auth
layout. Fill it with the app's bespoke decoration, wordmark, social
proof, etc. Pass `className` for width ratio, padding, gradient, and
positioning; extra props (`style`, `aria-*`, `data-*`) pass through to
the `<aside>`.

```typescript
interface AuthShellPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Cosmetic classes — width ratio, padding, gradient, positioning. */
  className?: string
}
```

#### `AuthShellProps`

Convenience preset for the most common layout: centered glass card
with optional decoration, brand panel, heading, body, footer, and a
"Back to home" link below the card. Equivalent to manually composing
`<AuthShellContainer>` + `<AuthShellDecoration>` + `<AuthShellCard>`
+ `<AuthShellHeading>` + `<AuthShellFooter>` + `<AuthShellBackLink>`.

For the two-column "brand panel + card" shape, use `<AuthShellSplit>`
+ `<AuthShellPanel>` + `<AuthShellCardColumn>` instead.

```typescript
interface AuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  brand?: ReactNode
  decoration?: ReactNode
  backTo?: string
  showBackLink?: boolean
  /**
   * Storage provider backing the cross-view auth form persistence
   * (email shared across Login/Signup/Forgot/Reset, cleared on success).
   * Defaults to a process-shared in-memory store; inject
   * `createSessionStorageProvider()` from
   * `@molecule/app-storage-localstorage` for tab-scoped persistence. The
   * shell renders an `<AuthFormStateProvider>`, so forms inside read it
   * via `useAuthFormStateContext()`.
   */
  formStateStorage?: StorageProvider
  /** Storage key for the persisted auth form state. */
  formStateKey?: string
}
```

#### `AuthShellSplitProps`

Outer frame for the two-column "decorated brand panel + card" auth
layout — the dominant shape across the fleet's polished auth pages.

A `min-h-screen` vertical stack: compose an `<AuthShellSplitRow>` (the
brand-panel + card-column row) as a child, and optionally a site
`<Footer />` after it. The row flexes to fill, so the footer sits at
the bottom.

Provides only the structural concern (`flex-col` + `min-h-screen`).
Background, text color, and font are per-app — pass them via
`className`.

```typescript
interface AuthShellSplitProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Cosmetic classes (background, text color, font) for the outer container. */
  className?: string
}
```

#### `AuthShellSplitRowProps`

The vertically-flexed two-column row inside `<AuthShellSplit>` —
compose `<AuthShellPanel>` and `<AuthShellCardColumn>` as its
children. Split out from `<AuthShellSplit>` so a site `<Footer />`
can sit below the row as a sibling child rather than a slot prop.

Provides only the `flex-1` vertical fill (so the row stretches and
any sibling footer sits at the bottom). The two-column layout itself
is the caller's choice — pass `className` with `cm.flex({})` for a
flex row or `cm.grid({ cols: 2 })` (or a custom grid template) so the
primitive never fights a grid-based shell.

```typescript
interface AuthShellSplitRowProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /**
   * Layout classes for the row — typically `cm.flex({})` or
   * `cm.grid({ cols: 2 })`. Appended after the `flex-1` vertical fill.
   */
  className?: string
}
```

#### `UseAuthFormStateOptions`

Options for {@link useAuthFormState}.

```typescript
interface UseAuthFormStateOptions {
  /**
   * Storage provider backing persistence. Defaults to a process-shared
   * in-memory provider (per the no-raw-storage rule), which still gives
   * cross-view persistence within a single SPA session. Inject
   * `createSessionStorageProvider()` from
   * `@molecule/app-storage-localstorage` for tab-scoped persistence that
   * also survives a full reload.
   */
  storage?: StorageProvider
  /** Storage key for the persisted fields. Defaults to `molecule.auth.form-state`. */
  storageKey?: string
  /** Seed values used before hydration completes / when storage is empty. */
  initialFields?: AuthFormFields
}
```

### Functions

#### `AuthFormStateProvider(props)`

Provides a single {@link useAuthFormState} instance to all descendants
via React context, so sibling/child auth forms share the same email.

```typescript
function AuthFormStateProvider({
  children,
  storage,
  storageKey,
  initialFields,
}: AuthFormStateProviderProps): JSX.Element
```

- `props` — Children plus optional storage provider, key, and seed fields.

**Returns:** The provider element.

#### `AuthShell({
  heading,
  subheading,
  children,
  footer,
  brand,
  decoration,
  backTo = '/',
  showBackLink = true,
  formStateStorage,
  formStateKey,
})`

Convenience preset composing container, decoration, card, heading, footer, and back-link into a single component.

Wraps its content in an `<AuthFormStateProvider>` so every form
rendered inside inherits cross-view email persistence via
`useAuthFormStateContext()`.

```typescript
function AuthShell({
  heading,
  subheading,
  children,
  footer,
  brand,
  decoration,
  backTo = '/',
  showBackLink = true,
  formStateStorage,
  formStateKey,
}: AuthShellProps): JSX.Element
```

#### `AuthShellBackLink({ to = '/', label })`

Back-navigation link rendered below the card, defaulting to "Back to home" via i18n.

```typescript
function AuthShellBackLink({ to = '/', label }: AuthShellBackLinkProps): JSX.Element
```

#### `AuthShellCard({
  children,
  surfaceClassName,
  className,
  outerClassName,
  dataMolId,
  style,
})`

Centered glassmorphic card surface with fixed flex-column layout and configurable surface treatment.

```typescript
function AuthShellCard({
  children,
  surfaceClassName,
  className,
  outerClassName,
  dataMolId,
  style,
}: AuthShellCardProps): JSX.Element
```

#### `AuthShellCardColumn({
  children,
  className,
  as = 'section',
  ...rest
})`

Centered-flex section or main column for the form-card half of a split or stacked auth layout.

```typescript
function AuthShellCardColumn({
  children,
  className,
  as = 'section',
  ...rest
}: AuthShellCardColumnProps): JSX.Element
```

#### `AuthShellContainer({
  children,
  style,
  className,
  layout = 'centered',
})`

Full-screen container with centered-flex or column layout and optional background decoration support.

```typescript
function AuthShellContainer({
  children,
  style,
  className,
  layout = 'centered',
}: AuthShellContainerProps): JSX.Element
```

#### `AuthShellDecoration({ children })`

Absolute-positioned background decoration layer — orbs, mesh gradients,
radial glows. Children render inside a `pointer-events-none absolute
inset-0 -z-10 overflow-hidden` wrapper.

```typescript
function AuthShellDecoration({ children }: { children: ReactNode; }): JSX.Element
```

#### `AuthShellFooter({ children })`

Footer inside the card — small text with a top border.

```typescript
function AuthShellFooter({ children }: { children: ReactNode; }): JSX.Element
```

#### `AuthShellHeading({
  heading,
  subheading,
  eyebrow,
  headingClassName,
  headingStyle,
})`

Centered heading block with optional eyebrow tag, h1 title, and subheading paragraph.

```typescript
function AuthShellHeading({
  heading,
  subheading,
  eyebrow,
  headingClassName,
  headingStyle,
}: AuthShellHeadingProps): JSX.Element
```

#### `AuthShellPanel({ children, className, ...rest })`

Decorative aside that collapses on mobile (hidden lg:flex) for the brand-panel half of a split auth layout.

```typescript
function AuthShellPanel({ children, className, ...rest }: AuthShellPanelProps): JSX.Element
```

#### `AuthShellSplit({ children, className, ...rest })`

Outer min-h-screen flex-col frame for the two-column brand-panel + card auth layout.

```typescript
function AuthShellSplit({ children, className, ...rest }: AuthShellSplitProps): JSX.Element
```

#### `AuthShellSplitRow({
  children,
  className,
  ...rest
})`

Vertically-filling flex-1 row inside AuthShellSplit that holds the brand panel and card column.

```typescript
function AuthShellSplitRow({
  children,
  className,
  ...rest
}: AuthShellSplitRowProps): JSX.Element
```

#### `useAuthFormState(options)`

React hook holding email + shared auth fields, persisted across auth
views via an injectable `StorageProvider` and cleared on successful
auth.

```typescript
function useAuthFormState(options?: UseAuthFormStateOptions): AuthFormState
```

- `options` — Optional storage provider, storage key, and seed fields.

**Returns:** The current fields plus `setField`/`setFields`/`clear` and a `hydrated` flag.

#### `useAuthFormStateContext()`

Reads the shared auth form state from the nearest
{@link AuthFormStateProvider} (which `<AuthShell>` renders by default).

```typescript
function useAuthFormStateContext(): AuthFormState
```

**Returns:** The shared {@link AuthFormState}.

### Constants

#### `DEFAULT_AUTH_FORM_STATE_KEY`

Default storage key for persisted auth form fields.

```typescript
const DEFAULT_AUTH_FORM_STATE_KEY: "molecule.auth.form-state"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-storage` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
