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

### Backend (`@molecule/api-*`)

**Core Interfaces** — abstract contracts with zero implementation dependencies:

| Interface | Package | Providers |
|-----------|---------|-----------|
| AI | `@molecule/api-ai` | Anthropic |
| Analytics | `@molecule/api-analytics` | Mixpanel, PostHog |
| Cache | `@molecule/api-cache` | Redis, Memcached, Memory |
| Code Sandbox | `@molecule/api-code-sandbox` | Docker |
| Config | `@molecule/api-config` | Environment Variables |
| Database | `@molecule/api-database` | PostgreSQL, MySQL |
| Emails | `@molecule/api-emails` | Mailgun, Sendgrid, SES, Sendmail |
| HTTP Client | `@molecule/api-http` | Axios, Fetch |
| i18n | `@molecule/api-i18n` | Simple |
| JWT | `@molecule/api-jwt` | jsonwebtoken |
| Logger | `@molecule/api-logger` | Pino, Winston, Loglevel, Console |
| OAuth | `@molecule/api-oauth` | GitHub, GitLab, Google, Twitter |
| Password | `@molecule/api-password` | bcrypt |
| Payments | `@molecule/api-payments` | Stripe, Apple, Google |
| Push Notifications | `@molecule/api-push-notifications` | Web Push |
| Queue | `@molecule/api-queue` | RabbitMQ, Redis, SQS |
| Secrets | `@molecule/api-secrets` | Environment, Doppler |
| Two-Factor | `@molecule/api-two-factor` | otplib |
| Uploads | `@molecule/api-uploads` | S3, Filesystem |

Plus: **5 typed resources** (user, project, device, conversation, payment), **4 middleware** packages, **infrastructure** (bond wiring, base resource), **validation**, **testing** utilities, and **24+ locale** translation packages.

### Frontend (`@molecule/app-*`)

**Core Interfaces:**

| Interface | Package | Providers |
|-----------|---------|-----------|
| AI Chat | `@molecule/app-ai-chat` | HTTP |
| Code Editor | `@molecule/app-code-editor` | Monaco |
| Forms | `@molecule/app-forms` | — |
| HTTP Client | `@molecule/app-http` | Axios |
| i18n | `@molecule/app-i18n` | i18next, react-i18next |
| IDE | `@molecule/app-ide` | Default |
| Live Preview | `@molecule/app-live-preview` | iframe |
| Routing | `@molecule/app-routing` | React Router, Vue Router, Next.js |
| State | `@molecule/app-state` | Zustand, Redux, Jotai |
| Storage | `@molecule/app-storage` | localStorage |
| Styling | `@molecule/app-styling` | Tailwind |
| Theme | `@molecule/app-theme` | CSS Variables |
| UI | `@molecule/app-ui` | Tailwind |

Plus: **auth**, **analytics**, **device**, **logger**, **platform**, **icons**, **fonts**, **utilities**, **version**, and more core packages.

**Frameworks** — each with hooks and UI bindings:

| Framework | Hooks | UI Components |
|-----------|-------|---------------|
| React | `@molecule/app-react` | `@molecule/app-react-ui` |
| Vue | `@molecule/app-vue` | `@molecule/app-vue-ui` |
| Svelte | `@molecule/app-svelte` | `@molecule/app-svelte-ui` |
| Solid | `@molecule/app-solid` | `@molecule/app-solid-ui` |
| Angular | `@molecule/app-angular` | `@molecule/app-angular-ui` |

**Features:** Charts, In-App Purchases, IDE, Maps, Rich Text, Video

**Native Capabilities** (23 packages): Badge, Battery, Biometrics, Bluetooth, Brightness, Calendar, Camera, Clipboard, Contacts, Filesystem, Geolocation, Haptics, Health, Keyboard, Lifecycle, Motion, Network, NFC, Push, Screen Orientation, Share, Splash Screen, Status Bar

**Locale Packages:** 70+ translation packages providing i18n support in 75+ languages.

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

[Apache-2.0](LICENSE) — Copyright 2025 molecule.dev
