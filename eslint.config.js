import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import svelte from 'eslint-plugin-svelte'
import tseslint from 'typescript-eslint'

import angularTestHostChangeDetection from './eslint-rules/angular-test-host-change-detection.mjs'
import noCamelCaseNativeEventsInVueH from './eslint-rules/no-camel-case-native-events-in-vue-h.mjs'
import noDomEventsInAngularCheckHooks from './eslint-rules/no-dom-events-in-angular-check-hooks.mjs'
import noHandPlacedNodes from './eslint-rules/no-hand-placed-nodes.mjs'
import { moleculeLocalPlugin } from './packages/tooling/eslint-config/src/plugin.mjs'
import {
  ROUTER_LIBRARY_FIX,
  ROUTER_LIBRARY_IMPORTS,
  ROUTER_LIBRARY_OWNERS,
} from './scripts/router-libraries.mjs'

/**
 * Local rules: the `molecule-local` plugin of `@molecule/eslint-config`, read from the package's
 * source so molecule lints with the rules it publishes, plus two rules only molecule's framework
 * ports need.
 *
 * `require-catch-binding` enforces AGENTS.md Rule 14 (no silent error
 * swallows): it forbids bindingless `catch {` and, with `rejectionHandlers`, parameterless
 * `.catch(() => …)` / `.then(…, () => …)` handlers so every error can be logged or explicitly
 * ignored; with no-unused-vars caughtErrors:'all' + caughtErrorsIgnorePattern
 * and argsIgnorePattern '^_', a catch must use the error or be a `catch
 * (_error)` / `(_error) =>` documented noop.
 *
 * `no-hand-styled-button` enforces Rule 5 / anti-pattern 12 at the one place
 * they leak: a `<button>` whose size, radius, typography or colour comes from a
 * hand-rolled inline `style` rather than `cm.button()`.
 *
 * `no-raw-class-names` enforces Rule 5 itself (CSS class names only in ClassMap
 * bonds) where every framework must render the same classes: the framework UI
 * packages.
 *
 * `no-literal-ui-text` enforces Rule 8 for JSX attributes a user reads or hears (`aria-label`,
 * `title`, `placeholder`, `alt`, …): their text goes through `t()` and a locale bond.
 *
 * `no-dom-events-in-angular-check-hooks` keeps `focus()`, `blur()`, `click()` and
 * `dispatchEvent()` out of Angular's change-detection hooks (and `ngOnDestroy`): their
 * listeners run while Angular is still checking the view, so a state change they make is
 * never rendered. molecule-only, so it is not in the package.
 *
 * `no-camel-case-native-events-in-vue-h` keeps React's listener spelling (`onMouseEnter`) off native
 * elements in a Vue `h()` call: Vue hyphenates the key, so the listener waits for a `mouse-enter`
 * event no browser fires. molecule-only, so it is not in the package.
 *
 * `no-hand-placed-nodes` keeps the Angular, Svelte, Solid and Vue ports from moving or removing a
 * DOM node by hand: the framework then removes its own nodes from the wrong parent and the
 * consumer's conditionals stop working. The message names each framework's placement or portal
 * tool. molecule-only, so it is not in the package.
 *
 * `angular-test-host-change-detection` makes every component an Angular test declares state its
 * change detection: Angular 22 checks one that sets none as OnPush, so a prop the test changes is
 * never rendered and the test asserts the first render. molecule-only, so it is not in the package.
 */
const moleculeLocal = {
  rules: {
    ...moleculeLocalPlugin.rules,
    'no-dom-events-in-angular-check-hooks': noDomEventsInAngularCheckHooks,
    'no-camel-case-native-events-in-vue-h': noCamelCaseNativeEventsInVueH,
    'no-hand-placed-nodes': noHandPlacedNodes,
    'angular-test-host-change-detection': angularTestHostChangeDetection,
  },
}

/**
 * App packages never import API packages. Shared by the .ts and .tsx blocks below: a later
 * `no-restricted-imports` entry replaces an earlier one's options for the files both match.
 */
const APP_CROSS_STACK_IMPORTS = {
  group: ['@molecule/api-*'],
  message:
    'App packages cannot import from @molecule/api-* packages. This is a cross-stack boundary violation.',
}

/**
 * The slot readers that run from a lifecycle hook. A hook can lag the content: `ngDoCheck` runs
 * before the consumer's `@if` adds its node, and no hook runs at all when the content comes
 * through an OnPush component in between, so the wrapper React renders for that content never
 * appears (2026-11-23: seven ports read their slots once, at view init). Shared by the .ts blocks
 * below, like {@link APP_CROSS_STACK_IMPORTS}.
 */
const ANGULAR_LIFECYCLE_SLOT_READERS = [
  {
    name: '@molecule/app-angular',
    importNames: ['hasContent'],
    message:
      "A slot read from a lifecycle hook lags the content. List `hostDirectives: [MolPlacement]`, call `usePlacement((hasContent) => setElementPresent(el, hasContent(el)))` in the constructor and read the slot with the `hasContent` it passes (all from '@molecule/app-angular').",
  },
  {
    name: '@molecule/app-ui-angular',
    importNames: ['hasNodes', 'SlotWrapper'],
    message:
      "A slot read from a lifecycle hook lags the content. List `hostDirectives: [MolPlacement]`, call `usePlacement((hasContent) => setElementPresent(el, hasContent(el)))` in the constructor and read the slot with the `hasContent` it passes (all from '@molecule/app-angular').",
  },
]

/**
 * Angular's signal-based component APIs, which these packages' tests cannot see. Each Angular
 * test compiles components with Angular's JIT compiler (`import '@angular/compiler'`), and JIT
 * reads inputs, outputs and queries only from decorator metadata: `input()`, `output()`,
 * `model()` and the signal queries are found by the ngc build alone, so under test a binding to
 * one is dropped without an error (2026-11-16: the chat widget launcher's `output()` never
 * opened its panel, and the error fallback's `input()` never received the error). Shared by
 * the .ts blocks below, like {@link APP_CROSS_STACK_IMPORTS}.
 */
const ANGULAR_SIGNAL_COMPONENT_APIS = [
  {
    name: '@angular/core',
    importNames: [
      'input',
      'output',
      'model',
      'viewChild',
      'viewChildren',
      'contentChild',
      'contentChildren',
    ],
    message:
      "Declare it in the component's metadata: Angular tests here compile with the JIT compiler, which sees only decorator metadata, so a binding to a signal input, output, model or query is silently dropped under test. Use `inputs: ['name']` (a plain field), `outputs: ['name']` with `readonly name = new EventEmitter<T>()`, and `@ViewChild` / `@ContentChild` (in a test, the `queries` metadata).",
  },
  {
    name: '@angular/core/rxjs-interop',
    importNames: ['outputFromObservable'],
    message:
      "Declare the output in the component's metadata (`outputs: ['name']` with an `EventEmitter`): Angular tests here compile with the JIT compiler, which does not see `outputFromObservable()`.",
  },
]

/**
 * Solid packages write .tsx too, but it is not React: rules for React components skip them,
 * and the framework rules below hold them instead.
 */
const SOLID_TSX = [
  'packages/app/frameworks/solid/**',
  'packages/app/frameworks/solid-ui/**',
  'packages/app/features/*-solid/**',
  'packages/app/infrastructure/bonds-default-solid/**',
  'packages/app/bonds/routing/solid-router/**',
]

/**
 * The source globs of every app package whose package.json depends on React (in `dependencies` or
 * `peerDependencies`), up to three directories below `packages/app`. Read from the manifests, not
 * the names: a React package gets React's hook rules whatever it is called (`routing/react-router`,
 * `embeddable-chat-widget`), and a Vue, Svelte, Solid or Angular package, whose `use*` functions
 * follow their own framework's rules, never does.
 */
const REACT_SOURCES = []
for (const pending = [['packages/app', 1]]; pending.length > 0;) {
  const [dir, depth] = pending.pop()
  for (const entry of readdirSync(join(import.meta.dirname, dir), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.'))
      continue
    const pkgDir = join(dir, entry.name)
    const manifest = join(import.meta.dirname, pkgDir, 'package.json')
    if (existsSync(manifest)) {
      const { dependencies = {}, peerDependencies = {} } = JSON.parse(
        readFileSync(manifest, 'utf8'),
      )
      if ('react' in dependencies || 'react' in peerDependencies)
        REACT_SOURCES.push(`${pkgDir}/src/**/*.{ts,tsx}`)
    } else if (depth < 3) pending.push([pkgDir, depth + 1])
  }
}

/** The naming-convention rule entry: PascalCase only for types and const values. */
const NAMING_CONVENTION = [
  'warn',
  { selector: 'interface', format: ['PascalCase'] },
  { selector: 'typeAlias', format: ['PascalCase'] },
  { selector: 'enum', format: ['PascalCase'] },
  { selector: 'enumMember', format: ['PascalCase'] },
  {
    selector: 'variable',
    modifiers: ['const'],
    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
    leadingUnderscore: 'allowSingleOrDouble',
    trailingUnderscore: 'allow',
  },
  {
    selector: 'variable',
    format: ['camelCase', 'UPPER_CASE'],
    leadingUnderscore: 'allowSingleOrDouble',
    trailingUnderscore: 'allow',
  },
  {
    selector: 'parameter',
    format: ['camelCase'],
    leadingUnderscore: 'allowSingleOrDouble',
  },
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'typeLike', format: ['PascalCase'] },
]

/**
 * The same rule for .svelte components, where a `let` variable may be PascalCase too: Svelte 5
 * declares props with `let { … } = $props()`, and a prop holding a component renders as <Target />.
 */
const SVELTE_NAMING_CONVENTION = NAMING_CONVENTION.map((entry) =>
  typeof entry === 'object' && entry.selector === 'variable' && !entry.modifiers
    ? { ...entry, format: [...entry.format, 'PascalCase'] }
    : entry,
)

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript'],
  // .svelte components (the Svelte binding and UI packages): eslint-plugin-svelte parses the
  // markup, typescript-eslint the <script lang="ts">, so they are held to the rules around them.
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.svelte'] },
    },
  },
  prettier,
  ...svelte.configs.prettier,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'molecule-local': moleculeLocal,
    },
    rules: {
      'molecule-local/no-class-code': 'error',
      'molecule-local/require-catch-binding': ['error', { rejectionHandlers: true }],
      'molecule-local/no-hand-styled-button': 'error',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'ExportNamedDeclaration:has(TSInterfaceDeclaration)',
            'ExportNamedDeclaration:has(TSTypeAliasDeclaration)',
            'ExportNamedDeclaration:has(TSEnumDeclaration)',
            'ExportNamedDeclaration:has(VariableDeclaration)',
            'ExportNamedDeclaration:has(FunctionDeclaration)',
          ],
          checkConstructors: false,
        },
      ],
      'jsdoc/require-description': ['warn', { contexts: ['any'] }],
      // Relaxed (2026-06-09): keep require-jsdoc + require-description so every
      // export stays documented for the README.md auto-gen / AI codegen, but
      // drop the very strict per-param / per-return detail rules (~3k warnings,
      // mostly self-evident params). Re-enable per-package if a package wants
      // fuller param docs.
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      // `e2e` is a first-class project tag, not a typo: `mlcl`'s api-extractor
      // slices the module-level `@e2e` block and the doc generator renders it as
      // README.md's "E2E Tests" section (provider bonds inherit their core's).
      // It was simply never declared here, so 142 deliberate blocks read as
      // invalid tags.
      'jsdoc/check-tag-names': [
        'warn',
        { definedTags: ['module', 'remarks', 'defaultValue', 'e2e'] },
      ],
      'jsdoc/check-param-names': 'off',
      'jsdoc/tag-lines': 'off',
      'jsdoc/require-throws-type': 'warn',
      'jsdoc/escape-inline-tags': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [['^node:'], ['^[^.]'], ['^@molecule/'], ['^\\.']],
        },
      ],
      'simple-import-sort/exports': 'warn',
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      '@typescript-eslint/naming-convention': NAMING_CONVENTION,
    },
  },
  {
    files: ['packages/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@molecule/app-*'],
              message:
                'API packages cannot import from @molecule/app-* packages. This is a cross-stack boundary violation.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [APP_CROSS_STACK_IMPORTS],
          paths: [...ANGULAR_SIGNAL_COMPONENT_APIS, ...ANGULAR_LIFECYCLE_SLOT_READERS],
        },
      ],
    },
  },
  {
    // The slot-reader entries are about component source. A test reads the binding's namespace to
    // type a `vi.mock` factory (`import type * as AngularBinding from '@molecule/app-angular'`),
    // which the rule counts as importing `hasContent`.
    files: ['packages/app/**/__tests__/**/*.ts', 'packages/app/**/*.{test,spec}.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [APP_CROSS_STACK_IMPORTS], paths: ANGULAR_SIGNAL_COMPONENT_APIS },
      ],
    },
  },
  {
    // dndkit-angular's directives keep their signal inputs: its suite compiles the package with
    // ngc and imports the build (vitest.global-setup.ts), so its tests see what consumers get.
    files: ['packages/app/bonds/drag-drop/dndkit-angular/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [APP_CROSS_STACK_IMPORTS], paths: ANGULAR_LIFECYCLE_SLOT_READERS },
      ],
    },
  },
  {
    // React components translate through the hook. `useTranslation()` (and `useT()`) from
    // @molecule/app-react subscribe to the provider's locale changes; the static `t` from
    // @molecule/app-i18n does not, so a component that calls it while rendering keeps the
    // old language after a switch until something else happens to re-render it. A helper
    // outside a component takes `t` as a parameter from the component that calls it.
    // Solid's .tsx is not React: its components read translations through its own primitives.
    files: ['packages/app/**/*.tsx'],
    ignores: [...SOLID_TSX, '**/__tests__/**', '**/*.test.tsx', '**/*.spec.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [APP_CROSS_STACK_IMPORTS],
          paths: [
            {
              name: '@molecule/app-i18n',
              importNames: ['t'],
              message:
                "A React component must read `t` from `useTranslation()` (or `useT()`) from '@molecule/app-react': the static `t` does not re-render the component when the locale changes. Pass that `t` to any helper outside the component.",
            },
          ],
        },
      ],
    },
  },
  {
    // The same rule for the Vue, Solid, Svelte and Angular UI and feature components: each
    // binding's `useTranslation()` (a ref, signal, store or Angular signal underneath) follows
    // the locale; the static `t` does not, so text rendered with it stays in the old language
    // (the conformance's "then a locale switch" cases show it against React's output).
    files: [
      'packages/app/frameworks/{vue-ui,solid-ui,svelte-ui,angular-ui}/src/**/*.{ts,tsx,svelte}',
      'packages/app/features/*-{vue,solid,svelte,angular}/src/**/*.{ts,tsx,svelte}',
    ],
    ignores: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [APP_CROSS_STACK_IMPORTS],
          paths: [
            {
              name: '@molecule/app-i18n',
              importNames: ['t'],
              message:
                "A UI component must translate through its framework binding's `useTranslation()` (@molecule/app-vue, -solid, -svelte or -angular): the static `t` does not follow a locale switch. A helper takes `t` from the component that calls it; an error thrown outside rendering is an `I18nError`.",
            },
            ...ANGULAR_SIGNAL_COMPONENT_APIS,
            ...ANGULAR_LIFECYCLE_SLOT_READERS,
          ],
        },
      ],
    },
  },
  {
    // Only the routing bonds and the composition roots import a router library: every other app
    // package reads the router through its framework binding, so it works under every routing
    // bond (scripts/router-libraries.mjs). A separate rule from `no-restricted-imports` above,
    // whose options each later block replaces, so this one block holds every app file.
    files: ['packages/app/**/*.{ts,tsx,svelte}'],
    ignores: ROUTER_LIBRARY_OWNERS.map((dir) => `${dir}**`),
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [{ group: ROUTER_LIBRARY_IMPORTS, message: ROUTER_LIBRARY_FIX }] },
      ],
    },
  },
  {
    // Native bond providers load their peer (react-native, expo-*, @react-native-*)
    // lazily via dynamic `import()` and type the result with `typeof import('peer')`.
    // That peer is an AMBIENT `declare module` (the real package ships Flow syntax
    // that breaks Vite/Vitest, so it's deliberately never installed) — and a
    // top-level `import type * as X` of an ambient module is unusable as a type
    // (TS2709 "namespace as type"). `typeof import('peer')` is therefore the ONLY
    // correct typing for these loaders, so allow the `import()` type annotation that
    // consistent-type-imports forbids elsewhere. Deliberate, scoped policy — not a
    // per-line suppression (CLAUDE Rule 9).
    files: [
      'packages/app/bonds/native/**/*.ts',
      'packages/app/bonds/storage/async-storage/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],
    },
  },
  {
    files: ['packages/app/bonds/icons/molecule/src/icons/**/*.ts'],
    rules: {
      'jsdoc/require-description': 'off',
    },
  },
  {
    // A Svelte package's docs show real Svelte templates, and `{@render children()}`,
    // `{@html …}`, `{@const …}`, `{@debug …}` and `{@attach …}` are Svelte syntax, not JSDoc
    // inline tags. Declaring them beats mangling the example: an escaped `{\@render}` would
    // document syntax that does not work, and scripts/check-doc-examples.mjs compiles each
    // example as written. Scoped to Svelte packages so the tags stay invalid everywhere else.
    files: ['packages/**/*svelte*/**/*.ts'],
    rules: {
      'jsdoc/check-tag-names': [
        'warn',
        {
          definedTags: ['module', 'remarks', 'defaultValue', 'e2e'],
          inlineTags: [
            'link',
            'linkcode',
            'linkplain',
            'tutorial',
            'render',
            'html',
            'const',
            'debug',
            'attach',
          ],
        },
      ],
    },
  },
  {
    // Rule 5 for the framework UI packages and the feature components built on
    // them: each one styles through ClassMap tokens, so React, Vue, Solid, Svelte,
    // Angular and React Native render the same classes from the same bond and a
    // styling swap is one bond change.
    files: [
      'packages/app/frameworks/*-ui/src/**/*.{ts,tsx}',
      'packages/app/features/*/src/**/*.{ts,tsx}',
    ],
    ignores: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'molecule-local/no-raw-class-names': 'error',
    },
  },
  {
    // Rule 8 for the components every app renders: an English literal in an attribute a user reads
    // or a screen reader announces reaches every locale untranslated.
    files: ['packages/app/**/src/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/*.test.tsx', '**/*.spec.tsx', '**/*.stories.tsx'],
    rules: {
      'molecule-local/no-literal-ui-text': 'error',
    },
  },
  {
    // React's hook rules on every React package. A hook that reads state its callback closed over
    // in an earlier render acts on stale values: ChatPanel's `/undo` read the undone tool calls
    // from the render its command callback was created in, so a second `/undo` reverted the same
    // files again (2026-11-17).
    files: REACT_SOURCES,
    ignores: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // A synchronous DOM event in an Angular change-detection hook runs its listeners while the
    // view is still being checked, so what they change is never rendered (a Tooltip that hid on
    // focusout stays open). Defer the call past the render with afterNextRender/afterEveryRender.
    files: ['packages/app/**/*angular*/src/**/*.ts', 'packages/app/frameworks/angular/src/**/*.ts'],
    rules: {
      'molecule-local/no-dom-events-in-angular-check-hooks': 'error',
    },
  },
  {
    // Vue binds an h() listener key on a native element by hyphenating it, so React's
    // `onMouseEnter` waits for a `mouse-enter` event and never runs. Write `onMouseenter`.
    files: ['packages/app/**/*vue*/src/**/*.ts', 'packages/app/frameworks/vue/src/**/*.ts'],
    rules: {
      'molecule-local/no-camel-case-native-events-in-vue-h': 'error',
    },
  },
  // A port that moves a node its framework rendered breaks that framework's removal of it: Svelte's
  // Dropdown lost its trigger on the next render, and Angular throws NG05106 or leaves the node in
  // the page. Each block names the framework whose placement tool the message gives.
  ...[
    ['angular', '{ts,mts}'],
    ['svelte', '{ts,svelte}'],
    ['solid', '{ts,tsx}'],
    ['vue', '{ts,vue}'],
  ].map(([framework, extensions]) => ({
    files: [
      `packages/app/features/*-${framework}/src/**/*.${extensions}`,
      `packages/app/frameworks/${framework}-ui/src/**/*.${extensions}`,
    ],
    ignores: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    rules: { 'molecule-local/no-hand-placed-nodes': ['error', { framework }] },
  })),
  {
    // Angular 22 checks a component with no changeDetection as OnPush: a test host whose props the
    // test changes never re-renders, and fifteen suites asserted their first render that way.
    files: [
      'packages/app/**/*angular*/src/**/__tests__/**/*.ts',
      'packages/app/**/*angular*/src/**/*.{test,spec}.ts',
      'packages/app/frameworks/conformance/src/adapters/angular*.ts',
    ],
    rules: { 'molecule-local/angular-test-host-change-detection': 'error' },
  },
  {
    // The vendored lint rules are plain ESM JavaScript, typed through JSDoc
    // (`@param {object} node`): a TS annotation is not valid there, so the
    // return-type rule cannot be satisfied and JSDoc types are the only types.
    files: ['eslint-rules/**/*.mjs', 'packages/tooling/eslint-config/src/**/*.mjs'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'jsdoc/no-types': 'off',
    },
  },
  {
    files: ['packages/api/testing/mock-server/**/*.ts'],
    rules: {
      'jsdoc/require-description': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx,mjs}', '**/*.test.{ts,tsx,mjs}', '**/*.spec.{ts,tsx,mjs}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'molecule-local/no-vacuous-optional-chain-assertion': 'error',
    },
  },
  {
    // `.mjs` as well as `.js`: repo tooling under scripts/ is plain Node ESM, and
    // a TS return annotation is not valid JavaScript there, so the rule cannot be
    // satisfied — only scoped off. The glob used to be `.js`-only, which left
    // scripts/precommit-secret-scan.mjs (the vendored secret scanner) reporting 3
    // unfixable warnings the moment it was first staged here. mlcl's config
    // already used `{mjs,js}`; this brings molecule in line with it.
    files: ['scripts/**/*.{mjs,js}'],
    // Runtime builtins that are not conventionally imported. console/process are
    // deliberately NOT here: scripts in this repo import them explicitly (see
    // check-feature-jsdocs.mjs), and declaring them would be a no-redeclare error.
    languageOptions: {
      globals: {
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      // `import process from 'node:process'` evaluates every property of process, `process.stdin`
      // included, which opens a piped stdin non-blocking; a synchronous read of it then throws EAGAIN
      // when the writer pauses (2026-11-18: the pre-commit's check-peer-floors, given 1,039 paths).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='readFileSync'][arguments.0.value=0], CallExpression[callee.property.name='readFileSync'][arguments.0.value=0], CallExpression[callee.name='readFileSync'][arguments.0.value='/dev/stdin'], CallExpression[callee.property.name='readFileSync'][arguments.0.value='/dev/stdin']",
          message:
            "Read stdin as a stream: `await text(process.stdin)` from 'node:stream/consumers'. A synchronous read of a piped stdin throws EAGAIN once anything has touched process.stdin.",
        },
      ],
    },
  },
  {
    // JavaScript a package runs as is, outside its TypeScript build: build scripts
    // (`<package>/scripts/*.mjs`) and CommonJS that Node or a tool requires directly
    // (a Tailwind preset, which tailwind.config.js loads with require(); module hooks
    // a test installs). JSDoc types are how these files are typed, a TS return
    // annotation is not valid JavaScript, and CommonJS loads with require(). As in
    // scripts/, console/process are imported explicitly, not declared.
    files: ['packages/**/scripts/**/*.mjs', 'packages/**/*.cjs'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'jsdoc/no-types': 'off',
    },
  },
  {
    files: ['packages/**/*.cjs'],
    // The CommonJS wrapper's bindings, as globals: `sourceType: 'commonjs'` crashes
    // svelte/no-inner-declarations (it reads a strict-mode flag a CommonJS scope lacks).
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'packages/**/dist/',
      // svelte-package's copy of each Svelte package's src (gitignored): a build output, not source.
      'packages/**/.svelte-kit/',
      'packages/**/node_modules/',
      'packages/**/*.d.ts',
      // …except a HAND-WRITTEN one under a package's src/ (ambient typings for
      // runtime-loaded native peers, JSX augmentations). .gitignore carves the
      // same glob out, so they are tracked as real source and lint must see them
      // too: eslint reports an ignored-but-named file as a WARNING, and the
      // pre-commit hook runs with --max-warnings 0, so committing one fails with
      // "File ignored because of a matching ignore pattern" — a gate firing at
      // the wrong thing.
      '!packages/**/src/**/*.d.ts',
      'packages/**/*.js',
      'packages/**/*.js.map',
    ],
  },
  {
    // After the shared rules, so these win for components.
    files: ['**/*.svelte'],
    rules: {
      // svelte-check type-checks every <script lang="ts">, which is what typescript-eslint
      // recommends over no-undef for TypeScript (it cannot see DOM or ambient globals).
      'no-undef': 'off',
      '@typescript-eslint/naming-convention': SVELTE_NAMING_CONVENTION,
      // A SvelteKit app resolves its own routes with $app/paths; these packages are libraries
      // rendered inside such apps and receive their hrefs as props.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // Renders the bonded icon set's SVG markup, as React's Icon does with
    // dangerouslySetInnerHTML; nothing user-supplied reaches it.
    files: ['packages/app/frameworks/svelte-ui/src/components/Icon.svelte'],
    rules: { 'svelte/no-at-html-tags': 'off' },
  },
  {
    // The single place @molecule/app-ide-svelte injects markup: a bare
    // `{@html}` fragment with no wrapper element, used by Icon, TabBar,
    // SearchPanel, FileTreeItem, StatusMark and StreamingIndicator. Its input
    // comes only from `@molecule/app-ui` and the bonded icon set, as React's
    // counterparts inject the same strings with `dangerouslySetInnerHTML`;
    // nothing user-supplied reaches it.
    files: ['packages/app/features/ide-svelte/src/parts/Markup.svelte'],
    rules: { 'svelte/no-at-html-tags': 'off' },
  },
  {
    // Renders the i18n catalog's legal HTML (`content.privacyPolicy` /
    // `content.termsOfService`) as the Privacy/Terms modal bodies, as React's
    // footer does with dangerouslySetInnerHTML. The catalog is app-supplied —
    // the same trust model as React's — and the interpolated `appName` is
    // HTML-escaped before it reaches the block, so sanitizing here would
    // render different DOM than the React reference for the same input.
    files: ['packages/app/features/footer-svelte/src/AppFooter.svelte'],
    rules: { 'svelte/no-at-html-tags': 'off' },
  },
)
