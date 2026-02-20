# molecule

Composable, injectable modules for full-stack applications.

molecule provides abstract interfaces for common application concerns — database, auth, email, payments, UI, routing, state, and many more — with swappable provider implementations wired at runtime. Write your application against stable interfaces. Swap providers without changing a single line of application code.

Currently available for **TypeScript/Node**. More languages and ecosystems coming.

## Architecture

molecule is built on one core idea: **decouple your application code from its implementations.**

```
Core Interface          Provider Bond           Your Application
─────────────────       ─────────────────       ─────────────────
@molecule/api-database  api-database-postgresql  bond('database', pg)
                        api-database-mysql       // swap provider ↑
                                                 // nothing else changes
```

- **Core packages** define abstract interfaces — types and contracts only, zero implementation
- **Bond packages** provide concrete implementations of those interfaces
- **`bond('category', provider)`** wires a provider at startup — consumers call `require('category')` anywhere
- **Normalization** ensures all providers for a category return the same types

This pattern applies everywhere: backend services, frontend UI, state management, styling, i18n, and more.

## Packages

All packages follow the naming convention `@molecule/api-*` (backend) and `@molecule/app-*` (frontend). Browse the `packages/` directory or any package's `MOLECULE.md` for full API documentation.

### Backend (`@molecule/api-*`)

Core interfaces with swappable provider bonds for: AI, analytics, cache, code sandboxing, configuration, database, emails, HTTP, i18n, JWT, logging, OAuth, password hashing, payments, push notifications, queues, secrets management, two-factor auth, file uploads, and more.

Additional package types: typed resources, middleware, infrastructure (bond wiring, base resource), validation, testing utilities, and locale translation packages.

### Frontend (`@molecule/app-*`)

Core interfaces with swappable provider bonds for: AI chat, analytics, code editing, forms, HTTP, i18n, IDE, live preview, routing, state management, storage, styling, theming, UI components, and more.

**Three-layer architecture** enables full framework and library swapping:

- **Layer 1**: Framework-agnostic interfaces (e.g., `@molecule/app-ui`)
- **Layer 2**: Framework bindings (React, Vue, Svelte, Solid, Angular — each with hooks + UI components)
- **Layer 3**: Library providers (e.g., ClassMap bonds for styling)

Additional package types: features (charts, maps, rich text, video, etc.), native device capabilities (camera, biometrics, geolocation, NFC, etc.), and locale translation packages.

## Quick Start

```bash
npm install @molecule/api-bond @molecule/api-database @molecule/api-database-postgresql
```

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-database-postgresql'
import { findMany } from '@molecule/api-database'

// Wire at startup
bond('database', provider)

// Use anywhere — database-agnostic
const users = await findMany<User>('users', {
  where: [{ field: 'status', operator: '=', value: 'active' }],
})
```

Switch to MySQL by changing one line:

```typescript
import { provider } from '@molecule/api-database-mysql'
```

No other code changes needed.

## Package Documentation

Every package has a `MOLECULE.md` file with installation instructions, API reference, usage examples, available providers, and peer dependency requirements. Browse any package directory to find its documentation.

## Development

```bash
git clone https://github.com/molecule-dev/molecule.git
cd molecule
npm install
npm run build       # Topological parallel build of all packages
npm test            # Vitest
npm run lint        # ESLint
npm run format:check  # Prettier
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE) — Copyright 2026 molecule.dev
