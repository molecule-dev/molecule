# Contributing to molecule

Thank you for your interest in contributing to molecule.

## Getting Started

```bash
git clone https://github.com/molecule-dev/molecule.git
cd molecule
npm install
npm run build
npm test
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run checks:
   ```bash
   npm run lint
   npm run format:check
   npm test
   ```
4. Add a changeset describing your change:
   ```bash
   npx changeset
   ```
5. Commit, push, and open a pull request against `main`

## Changesets

Every user-facing change needs a changeset. Run `npx changeset`, select the affected packages, choose the appropriate semver bump (patch/minor/major), and write a summary. The release workflow consumes changesets to version and publish packages.

Internal-only changes (CI config, dev tooling, docs) do not need a changeset.

## Code Standards

Architecture rules are documented in [AGENTS.md](AGENTS.md). Key points:

- **Module organization**: No implementation in `index.ts` — barrel exports only (`export * from './module.js'`)
- **ESM**: All imports use `.js` extensions. ES2022, NodeNext module resolution.
- **Typed providers**: `export const provider: InterfaceType = { ... }` — never omit the type annotation
- **Core packages are interfaces only**: Zero implementation, zero concrete library imports
- **No CSS class names outside ClassMap bonds**: Use `getClassMap()` from `@molecule/app-ui`
- **All UI text through i18n**: `t('key', values, { defaultValue })` — translations in companion locale bonds
- **Exact dependency pinning**: No `^`, `~`, or ranges (except `peerDependencies`)
- **JSDoc on all exports**: Description, `@param`, `@returns`

### Code Style

- **Prettier**: Single quotes, no semicolons, trailing commas, 100-character line width, LF line endings
- **ESLint**: TypeScript strict mode, import sorting, cross-stack boundary enforcement
- **Pre-commit hook** (Husky): Runs `format:check` and `lint` automatically

## Testing

- **Framework**: Vitest
- **Test location**: `src/__tests__/` within each package
- **Run all tests**: `npm test` from the monorepo root
- **Mock utilities**: `@molecule/api-testing` provides mock implementations for bond interfaces

## Pull Request Process

1. CI must pass (build, test, lint, format check)
2. Include a changeset for user-facing changes
3. Describe what changed and why in the PR description
4. One approval required for merge

## Commit Messages

Follow [conventional commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `refactor:` — code restructuring without behavior change
- `test:` — test additions or changes
- `chore:` — maintenance tasks (CI, tooling, dependencies)

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0](LICENSE) license.
