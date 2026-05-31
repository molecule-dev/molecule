# molecule

An AI-first approach to building scalable, composable, and secure full-stack applications.

Molecule is a composable package ecosystem with a growing catalog of battle-tested packages that connect through abstract interfaces and machine-readable documentation. AI agents can read, scaffold, wire, and swap any package because every package follows the same contracts and patterns.

Works for enterprise, startups, and side projects. Same packages, same architecture, same tooling at every scale. Currently available for **TypeScript/Node**, with the architecture designed to expand to any language and platform.

## Why AI-First

AI coding tools work best with clean, consistent, well-documented codebases. Molecule is designed to be exactly that:

- **Strict interfaces**: every package defines abstract contracts (types and signatures only), so there's no ambiguity about what to implement or how to consume it
- **Machine-readable documentation**: every package has a `MOLECULE.md` auto-generated from source code, always accurate, always in sync
- **Deterministic patterns**: bond system, module organization, naming conventions, and architectural rules are consistent across every package. AI that understands one understands them all.

AI agents can scaffold entire applications, wire services, swap providers, and generate architecturally correct code, not just autocomplete lines. The same constraints that make this possible also make the codebase cleaner for humans.

## Architecture

Every design rule comes from one test:

> **"If we swapped the implementation (different provider, different framework, different database), would this line need to change?"**
>
> If yes, fix it.

### The Bond System

```
Core Interface          Provider Bond           Your Application
-----------------       -----------------       -----------------
@molecule/api-database  api-database-postgresql  bond('database', pg)
                        api-database-mysql       // swap provider ^
                                                 // nothing else changes
```

- **Core packages**: abstract interfaces only, zero implementation
- **Bond packages**: concrete implementations (PostgreSQL, Redis, Stripe, Mailgun, etc.)
- **`bond('category', provider)`**: wires a provider at startup; consumers call `require('category')` anywhere
- **Normalization**: all providers for a category return the same types. `findMany()` works the same on PostgreSQL, MySQL, or SQLite.

The same pattern applies to every category a full-stack app needs, backend and frontend, from data, auth, and payments to messaging, AI, and analytics. New categories slot in the same way as the ecosystem grows.

### Three-Layer Frontend

- **Layer 1**: framework-agnostic interfaces (`@molecule/app-ui`, `@molecule/app-routing`, `@molecule/app-state`, etc.)
- **Layer 2**: framework bindings implementing Layer 1 using native idioms (hooks, composables, stores, signals, services). New frameworks added without touching existing code.
- **Layer 3**: library providers (styling, state management, etc.) wired through bonds. New libraries slot in without changing framework or application code.

Swap framework by changing Layer 2+3. Application logic stays the same.

### The N+M Pattern

Instead of N frameworks x M styling libraries (N*M implementations), Molecule's UIClassMap collapses this to N+M. Framework UI packages use abstract class tokens. ClassMap bonds resolve them to CSS classes. Adding a styling library = one ClassMap. Adding a framework = one UI binding. Both dimensions scale independently.

### i18n and Locale Bonds

Every package with user-facing text has a companion locale bond with translations in dozens of languages. Feature packages use `t('key', values, { defaultValue: 'English' })`, no hardcoded strings. Locale bonds are pure data. Adding a language = adding translation data, no code changes.

## Quick Start

Go to [molecule.dev](https://molecule.dev) and describe what you want to build. Your prompt opens the builder, an AI-powered IDE that scaffolds a real full-stack project with the right packages already wired together, runs it in a live sandbox, and deploys it when you're ready.

Prefer to work locally? The whole ecosystem is open source, install the packages and wire them by hand using the same bond pattern.

### Example: The Bond Pattern

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-database-postgresql'
import { findMany } from '@molecule/api-database'

// Wire at startup
bond('database', provider)

// Use anywhere, database-agnostic
const users = await findMany<User>('users', {
  where: [{ field: 'status', operator: '=', value: 'active' }],
})
```

Switch to MySQL:

```typescript
import { provider } from '@molecule/api-database-mysql'
```

Nothing else changes.

## How the AI-First Approach Works

### Self-Documenting Packages

Every package has a `MOLECULE.md`, installation, full API reference, usage examples, provider relationships, environment variables, peer dependencies. Auto-generated from source code JSDoc. Always accurate, always in sync. Consistent format across every package so AI agents can parse any of them the same way.

### AI Code Generation

Molecule's tooling uses AI with tiered context: ecosystem overview for package selection, then detailed MOLECULE.md content for the specific packages being wired. Generated code follows the same architectural rules as hand-written code because the rules are encoded in the interfaces.

## Standard Tooling

Nothing proprietary, just the tools and conventions professional teams already use: strict TypeScript and ESM, npm workspaces, your choice of frontend framework, Vite, Vitest, ESLint and Prettier, semantic versioning, conventional commits, exact dependency pinning, and CI/CD that works with any pipeline. It fits your existing workflow instead of replacing it, and the toolchain keeps growing.

## Package Ecosystem

A growing ecosystem covering full-stack application concerns, with no ceiling. Every new provider, framework, or integration becomes a reusable building block for every project. Any stack, any platform, any library can be added, and the categories below are just where it stands today.

### Backend (`@molecule/api-*`)

Core interfaces and provider bonds across every backend concern:

- Data and storage
- Identity and security
- Payments and billing
- Messaging and notifications
- Background work and scheduling
- AI and agents
- Analytics and observability
- And more, added continuously

Plus typed resources, middleware, validation, testing utilities, CI/CD, staging environments, and locale packages.

### Frontend (`@molecule/app-*`)

Core interfaces and provider bonds across every frontend concern:

- UI, styling, and theming
- Routing and state
- Forms and data
- Auth and storage
- Device and platform capabilities
- And more, added continuously

Plus framework bindings for every major framework (including React Native for mobile), rich features like charts, maps, and rich text, and locale translations in dozens of languages.

Every package has a `MOLECULE.md` with installation, API reference, usage examples, providers, and peer dependencies.

## Add Your Service to Molecule

Want your service or integration available to every Molecule application? Open a GitHub issue describing your service and how it works. Our AI-assisted workflow will generate a conformant bond package and open a PR for review. Once approved, it ships as part of the `@molecule` ecosystem, instantly available to every project using that interface.

- **For service providers**: describe your API and authentication flow. We handle the bond implementation, documentation, and publishing under `@molecule`.
- **For developers**: spot a missing provider or integration? Open an issue or submit a PR. The interface contracts are public, so building a conformant bond is straightforward.
- **For organizations**: you can also create private bonds for internal services, proprietary databases, or custom infrastructure using the same interface contracts and patterns.

## Analytics and Data-Driven Development

Analytics is a first-class concern, not an afterthought.

Backend (`@molecule/api-analytics`) and frontend (`@molecule/app-analytics`) use the same bond pattern. Track against the abstract interface, wire any provider (Mixpanel, Segment, PostHog, custom). Switch providers without changing tracking calls.

Track user behavior, performance, business metrics, and infrastructure health against one normalized interface. Provider-agnostic event streams let you build dashboards, alerts, experiments, and feedback loops on consistent data. Outgrow a provider, swap it, keep your instrumentation.

## Vision

### Today

A growing catalog of TypeScript packages. Multiple frontend frameworks. AI-assisted scaffolding. Machine-readable docs for every package. Usable now for real applications.

### Where It's Going

**Deeper AI integration.** The structured architecture, normalized interfaces, machine-readable docs, deterministic patterns, is built for a future where AI agents compose entire applications from a conversation, selecting and wiring packages automatically.

**Every language, every ecosystem.** The bond pattern (abstract interfaces + swappable providers + runtime wiring) is language-agnostic. The same architecture can power any language ecosystem with its own package catalog and provider bonds.

**Every platform.** Same composable architecture targeting mobile, desktop, edge, and any future runtime. Platform-specific code stays in provider bonds; application logic stays portable.

**Enterprise.** Private registries, organization-scoped packages, compliance bonds (SOC2, HIPAA, GDPR), security scanning, enterprise support.

**Community.** Third-party bonds, community providers, a marketplace. Universal interface contracts mean any provider package works with any application using that interface.

**Self-improving.** Every new provider bond makes every existing application more capable. Every new framework binding works with every existing ClassMap and locale bond. The ecosystem grows multiplicatively.

## Development

```bash
git clone https://github.com/molecule-dev/molecule.git
cd molecule
npm install
npm run build       # Topological parallel build
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

[Apache-2.0](LICENSE), Copyright 2026 molecule.dev
