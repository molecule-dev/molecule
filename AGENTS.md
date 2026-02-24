# AGENTS.md — molecule.dev

## The Decoupling Principle

Before writing any import, literal value, or function call, apply this test:

> **"If we swapped out the implementation behind this (different provider, different framework, different library, different database), would this line need to change?"**
>
> If yes — you are coupling to an implementation. Fix it:
> - **Importing a concrete driver in a handler?** → Use the abstract core interface instead.
> - **Using a platform-specific API directly?** → Accept it as an injectable parameter.
> - **Writing CSS class names in a component?** → Use `getClassMap()` from `@molecule/app-ui` instead. The ONLY packages that may contain CSS class names are ClassMap bond packages (e.g., `@molecule/app-ui-tailwind`).
> - **Writing raw SQL in handler code?** → Use the abstract `DataStore` methods.
> - **Hardcoding user-facing text?** → Use `t('key', values, { defaultValue })`.

This single principle generates every specific rule below. When in doubt, return to this test.

---

## Project Overview

Composable, injectable modules for full-stack applications.

- Backend packages: `@molecule/api-*`
- Frontend packages: `@molecule/app-*`
- **Core packages** define contracts (interfaces only, zero implementation)
- **Bond packages** implement those contracts and are swappable at runtime
- Bond wiring: `bond('category', provider)` at startup, `require('category')` anywhere

---

## Rules

### 1. Module Organization

Split code into logical modules. NEVER put implementation code in `index.ts`.

```
src/
├── types.ts        # Types, interfaces, enums only
├── provider.ts     # setProvider/getProvider/hasProvider
├── [feature].ts    # Feature-specific logic
├── utilities.ts    # Helper functions
└── index.ts        # ONLY export * from './module.js' — barrel exports only
```

Always `export * from './module.js'` in barrel files. Never `export { name } from` or `export type { Name } from`.

### 2. ESM with .js Extensions

All imports MUST use `.js` extensions. TypeScript, ES2022, NodeNext module resolution.

```typescript
// Correct
export * from './types.js'
import { DatabaseConfig } from '@molecule/api-database/types.js'

// Wrong
export * from './types'
import { DatabaseConfig } from '@molecule/api-database/types'
```

### 3. Typed Provider Exports

Every provider MUST export a typed constant:

```typescript
export const provider: InterfaceType = { ... }
```

Never omit the type annotation. The core interface package is always a `peerDependency`.

### 4. No Concrete Dependencies in Core Packages

Core packages (`packages/api/core/*`, `packages/app/core/*`) contain ONLY interfaces and types. Zero implementation code, zero concrete library imports.

### 5. No CSS Class Names Outside ClassMap Bonds

No CSS class names (`"flex"`, `"p-4"`, `"btn-primary"`, `"items-center"`, etc.) may appear in ANY package except ClassMap bond packages (e.g., `@molecule/app-ui-tailwind`). This includes templates, components, tests, and generated code. Use `getClassMap()` from `@molecule/app-ui` instead. Swapping one styling library for another should only require changing the ClassMap bond — nothing else.

### 6. No Raw SQL in Handlers

Handler code uses abstract DataStore methods (`findOne`, `findMany`, `create`, `updateById`, `deleteById`). Raw SQL only in database bond packages, migration scripts, or complex queries wrapped in dedicated functions.

### 7. No Hardcoded Storage

Never use `localStorage`/`sessionStorage`/`AsyncStorage` directly. Accept `StorageAdapter` as a parameter. Default to in-memory, not localStorage.

### 8. All UI Text Through i18n

Never hardcode user-visible strings (labels, placeholders, messages, aria-labels). Use:

```typescript
t('key', values, { defaultValue: 'English fallback' })
```

Translations live in **companion locale bond packages** (`@molecule/{stack}-locales-{name}`), NOT embedded in feature packages. Each locale bond provides type-safe translations in 79 languages.

### 9. Exact Dependency Pinning

All versions in `dependencies`, `devDependencies`, and `optionalDependencies` must be **exact** — no `^`, `~`, `*`, `>=`, or ranges. The only exception is `peerDependencies` (which may use ranges for npm compatibility).

Enforced by `.npmrc` with `save-exact=true`. When writing code that touches dependency versions, always verify pinning.

### 10. Package Naming

- Backend: `@molecule/api-*`, Frontend: `@molecule/app-*`
- Names must be specific enough to be unambiguous. Ask: "Could this name mean something else?" If yes, add a qualifier (e.g., `app-ai-chat` not `app-chat`).

### 11. Cross-Stack Boundary

API packages cannot import `@molecule/app-*`. App packages cannot import `@molecule/api-*`. ESLint enforces this.

### 12. JSDoc on All Exports

All exported functions, classes, interfaces, types, and constants require JSDoc with description, `@param`, and `@returns` where applicable.

### 13. Import Ordering

Sorted by: `node:` builtins → external packages → `@molecule/*` → relative paths. Enforced by `eslint-plugin-simple-import-sort`.

---

## Anti-Patterns

1. Concrete dependencies in core packages
2. Returning raw provider types instead of normalized interfaces
3. Skipping peer dependencies for core interfaces
4. Hardcoded configuration instead of env vars via `@molecule/api-config`
5. Implementation leakage — exposing provider internals in public API
6. Non-conformant provider exports (loose functions instead of typed `provider` object)
7. Named re-exports in barrel files (`export { X } from`) instead of `export * from`
8. CSS class names in ANY package other than ClassMap bond packages
9. Hardcoded UI text — English strings directly in JSX/templates instead of `t('key')` calls
10. Embedding translations in feature packages instead of companion locale bonds
11. Unpinned dependency versions (`^1.0.0` or `~2.3.0` instead of exact `1.0.0`)

---

## Package Structure

### Directory Layout

```
packages/
├── api/
│   ├── core/           # Abstract interfaces (database, emails, cache, ai, etc.)
│   ├── bonds/          # Provider implementations, grouped by category
│   │   ├── database/   #   e.g. postgresql/, mysql/
│   │   └── ...
│   ├── infrastructure/ # bond (wiring), resource (base resource)
│   ├── resources/      # Typed resources (user, project, device, etc.)
│   ├── middleware/      # Framework middleware wrappers
│   ├── utilities/      # Validation, JWT, password, etc.
│   ├── testing/        # Mock implementations and test helpers
│   ├── ci/             # CI integration packages
│   ├── staging/        # Staging driver implementations
│   └── locales/        # i18n translation packages
├── app/
│   ├── core/           # Abstract interfaces (ui, routing, state, etc.)
│   ├── bonds/          # Provider implementations
│   ├── infrastructure/ # bond (wiring)
│   ├── features/       # IDE, charts, maps, rich-text, video
│   ├── native/         # Device capabilities (camera, biometrics, etc.)
│   ├── frameworks/     # Framework bindings + UI (react, vue, svelte, solid, angular, react-native)
│   └── locales/        # i18n translation packages
```

### Single Package Structure

```
package-name/
├── src/
│   ├── types.ts
│   ├── provider.ts
│   ├── index.ts        # Barrel exports only
│   └── __tests__/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── MOLECULE.md         # Auto-generated documentation
```

---

## Build & Test

```bash
npm install             # Install all dependencies (from monorepo root)
npm run build           # Topological parallel build of all packages
npm test                # Vitest
npm run lint            # ESLint
npm run format:check    # Prettier
```

---

## Key Patterns

### Bond System

`bond('category', provider)` — string-based runtime wiring. Core defines contract → Provider implements → App wires at startup → Consumer uses anywhere via `require('category')`.

### Normalization

All providers for a category return the SAME types. `sendMail()` returns `EmailSendResult` regardless of Sendgrid/Mailgun/SES.

### Peer Dependencies

Providers declare core interfaces as `peerDependencies`. This prevents version conflicts and enables interface upgrades without breaking providers.

### Three-Layer Frontend

- **Layer 1**: Framework-agnostic interfaces (`@molecule/app-ui`, etc.)
- **Layer 2**: Framework bindings (`@molecule/app-ui-react`, `-vue`, `-svelte`, `-solid`, `-angular`, etc.)
- **Layer 3**: Library providers (`@molecule/app-ui-tailwind`, etc.)

Swap entire framework by changing Layers 2+3.

### UIClassMap

`getClassMap()` resolves styling at render time. Adding a styling library = 1 new ClassMap bond implementation. All framework packages work unchanged.

### Locale Bonds

Every package with user-facing text has a companion locale bond (`@molecule/{stack}-locales-{name}`) providing translations in 79 languages. Feature packages use `t(key, values, { defaultValue })` with English inline fallbacks. Locale bonds are pure data — swap one to override all translations for that feature.

---

## Tech Stack

- TypeScript 5.9, ES2022, NodeNext module resolution
- Vitest for testing
- ESLint + Prettier for code quality
- Changesets for versioning and releases
- npm workspaces monorepo
- Node >= 20
