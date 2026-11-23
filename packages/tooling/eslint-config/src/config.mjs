/**
 * `moleculeEslintConfig`: the flat ESLint config every Molecule workspace runs.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

import { jsxA11yGate, vueA11yGate } from './a11y.mjs'
import { moleculeLocalPlugin } from './plugin.mjs'
import { iconFonts, resourceTables } from './registry-snapshot.mjs'
import { resourceTableOwners } from './rules/no-resource-table-writes.mjs'
import { generatedResourceClientConfig } from './rules/prefer-generated-resource-clients.mjs'

/**
 * The flat config for one workspace: every rule below, with the switches its own
 * `package.json` (and `migrations/`) decide, and the framework plugins it declares.
 *
 * @param {string | URL} configUrl - The workspace's `eslint.config.js` URL (`import.meta.url`).
 *   Its manifest and migrations are read next to it, never from a hoisted parent.
 * @param {{ generatedResourceClients?: unknown[] }} [options] - The resource clients the
 *   project generated (the marked block in its config).
 * @returns {Promise<import('eslint').Linter.Config[]>} The config array.
 */
export async function moleculeEslintConfig(configUrl, { generatedResourceClients = [] } = {}) {
  // Resolve declared capability contracts once for this workspace.
  // Read this config's own workspace manifest, never a hoisted parent manifest.
  let apiWorkspace = false
  let resourceOwners = {}
  // Whether this workspace declares the shared query cache (its hooks replace a hand-written one).
  let queryCache = false
  let routingBond = false
  let optimisticValue = false
  // Whether this workspace depends on React: React's hook rules apply only there. The
  // Vue, Solid, Svelte and Angular bindings export `use*` functions too, but they are
  // composables or injection-context calls (an Angular component's field initializer is
  // their documented call site), which React's function-component model does not describe.
  let reactWorkspace = false
  // Whether Metro bundles this workspace: a React Native app runs on react-native itself (a
  // react-native-web app, which Vite builds, does not depend on it).
  let metroWorkspace = false
  // The installed dev tooling, read for the framework lint plugins below.
  let devDependencies = {}
  try {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', configUrl), 'utf8'))
    devDependencies = manifest.devDependencies ?? {}
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    }
    queryCache = '@molecule/app-query-react' in dependencies
    routingBond = '@molecule/app-routing-react-router' in dependencies
    optimisticValue = '@molecule/app-react' in dependencies || '@molecule/app-state' in dependencies
    // Every api package is named @molecule/api-* (mlcl's registry test holds name and stack together).
    apiWorkspace = Object.keys(dependencies).some((name) => name.startsWith('@molecule/api-'))
    reactWorkspace = 'react' in dependencies
    metroWorkspace = 'react-native' in (manifest.dependencies ?? {})
    resourceOwners = resourceTableOwners(
      resourceTables,
      { ...dependencies, ...devDependencies },
      new URL('./migrations/', configUrl),
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  // `eslint-plugin-security` is deliberately NOT wired in. The classes its
  // low-false-positive rules target (raw SQL, direct fs access, eval) are removed
  // by this stack's architecture (DataStore abstraction, secrets bond), and its
  // remaining rules (detect-object-injection, detect-non-literal-fs-filename,
  // detect-possible-timing-attacks) are noisy enough that they get globally
  // disabled in practice. The real vulnerability surface — vulnerable dependencies
  // and leaked credentials — is covered by `npm audit` + Dependabot + gitleaks in
  // .github/workflows/security.yml. See SECURITY.md → "Why not eslint-plugin-security?".

  /**
   * Lint for the component files a framework writes outside .ts/.tsx. ESLint opens a
   * file only when some config's `files` matches it, so without these a Vue or Svelte
   * app's `npm run lint` passed without reading a single component: its markup, its
   * accessibility and the script inside it went unchecked. A Vue or Svelte scaffold
   * declares the plugin as a devDependency (registry `appFrameworks`); every other
   * workspace declares neither and gets no extra config. Each block parses the
   * component's script with typescript-eslint, so the TypeScript rules below apply
   * there as they do in .tsx (see COMPONENT_FILES for the two they relax).
   */
  const frameworkConfigs = []
  const componentFiles = []
  if ('eslint-plugin-vue' in devDependencies) {
    const { default: vue } = await import('eslint-plugin-vue')
    const { default: vueA11y } = await import('eslint-plugin-vuejs-accessibility')
    // One object for every block: ESLint refuses two different plugins under one name.
    const vueA11yPlugin = vueA11yGate(vueA11y)
    componentFiles.push('**/*.vue')
    frameworkConfigs.push(
      ...vue.configs['flat/recommended'],
      ...vueA11y.configs['flat/recommended'].map((config) =>
        config.plugins
          ? { ...config, plugins: { ...config.plugins, 'vuejs-accessibility': vueA11yPlugin } }
          : config,
      ),
      {
        files: ['**/*.vue'],
        languageOptions: {
          parserOptions: {
            parser: tseslint.parser,
            extraFileExtensions: ['.vue'],
            sourceType: 'module',
          },
        },
        rules: {
          // Component names mirror the React scaffold's (Header, Footer, Home …) so a
          // framework swap keeps every file and import name. The rule guards against a
          // clash with an HTML element in in-DOM templates; a scaffold's components are
          // PascalCase SFCs, which never clash.
          'vue/multi-word-component-names': 'off',
          // Raw HTML is rendered in exactly the places React renders it with
          // dangerouslySetInnerHTML (the app's own policy pages, the icon set's SVG);
          // jsx-a11y does not flag those there, and the Vue app is held to the same rule.
          'vue/no-v-html': 'off',
          // A label tied to its control by id is as valid as a wrapping one, as jsx-a11y's
          // label-has-associated-control accepts either in the React app. The plugin's default
          // demands both; the floating-label inputs render a sibling <label for> because the
          // label is absolutely positioned and styled from the input's focus state.
          'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
        },
      },
    )
  }
  if ('eslint-plugin-svelte' in devDependencies) {
    const { default: svelte } = await import('eslint-plugin-svelte')
    componentFiles.push('**/*.svelte', '**/*.svelte.ts')
    frameworkConfigs.push(...svelte.configs.recommended, {
      files: ['**/*.svelte', '**/*.svelte.ts'],
      languageOptions: {
        parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.svelte'] },
      },
      rules: {
        // As vue/no-v-html above: {@html} renders what React renders with
        // dangerouslySetInnerHTML, and nothing else.
        'svelte/no-at-html-tags': 'off',
      },
    })
  }
  /**
   * What a component file relaxes, as .tsx does below: a component's functions return
   * markup or nothing, so explicit return types restate the body, and undefined names
   * are the framework type checker's job there (vue-tsc, svelte-check), which knows the
   * names the compiler injects (`$props`, `defineProps`) and core no-undef does not.
   * Placed after the main rules block, which would otherwise re-enable the first.
   */
  const COMPONENT_FILES = componentFiles.length
    ? [
        {
          files: componentFiles,
          rules: {
            'no-undef': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
          },
        },
      ]
    : []

  return tseslint.config(
    ...generatedResourceClientConfig(generatedResourceClients, configUrl, process.env.VITE_API_URL),
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    // The TypeScript parser's root is this workspace. Left unset, typescript-eslint infers it from the
    // `eslint.config.*` files on the call stack and refuses to parse anything once one process has
    // loaded two of them (an editor serving a project's api/ and app/, or a test suite).
    {
      languageOptions: {
        parserOptions: { tsconfigRootDir: fileURLToPath(new URL('.', configUrl)) },
      },
    },
    // Before prettier, so eslint-config-prettier also turns off the formatting rules
    // these plugins' recommended sets enable.
    ...frameworkConfigs,
    prettier,
    {
      plugins: {
        'simple-import-sort': simpleImportSort,
        'molecule-local': moleculeLocalPlugin,
      },
      rules: {
        // The scaffold's publicViews is an allow-list. A root glob silently opens
        // every present and future route, including undeclared private routes.
        // Keep router fallback routes and bounded public subtrees unrestricted.
        'no-restricted-syntax': [
          'error',
          {
            // Inspect the policy's own array, not metadata arrays or opaque initializer calls.
            selector: [
              '',
              'TSAsExpression > ',
              'TSSatisfiesExpression > ',
              'TSSatisfiesExpression > TSAsExpression > ',
            ]
              .map(
                (assertion) =>
                  "VariableDeclarator[id.name='publicViews'] > " +
                  assertion +
                  "ArrayExpression > ObjectExpression > Property:matches([computed=false][key.name='path'], [key.value='path']) > Literal:matches([value='*'], [value='/*'])",
              )
              .join(', '),
            message:
              'Root wildcards make publicViews allow every route. List public paths instead. For a deliberately public router, use a narrow ESLint disable and guard private routes with AuthGuard.',
          },
        ],
        'molecule-local/no-class-code': 'error',
        'molecule-local/no-empty-interactive-target': ['error', { iconFonts }],
        'molecule-local/require-icon-font-setup': ['error', { iconFonts }],
        'molecule-local/prefer-declared-clients': 'error',
        'molecule-local/no-in-app-document-navigation': [
          'error',
          { apiBase: process.env.VITE_API_URL ?? '/api' },
        ],
        'molecule-local/async-collections-have-status': 'error',
        'molecule-local/effects-preserve-form-edits': 'error',
        'molecule-local/no-dropped-action': 'error',
        'molecule-local/no-duplicate-list-wrapper': 'error',
        // Fixable: the deploy applies its ESLint fix, like the other fixable warnings here.
        'molecule-local/single-image-name-link': 'warn',
        'molecule-local/no-fixed-navigation-truncation': 'warn',
        'molecule-local/unique-update-excludes-self': 'warn',
        ...(routingBond
          ? {
              'molecule-local/router-commits-with-url': 'warn',
              'molecule-local/url-lists-use-list-route': 'warn',
              'molecule-local/url-selections-declare-access': 'error',
            }
          : {}),
        // For adapters implemented in other files, a file-specific override may declare
        // persistenceFunctions: ['adapter.save']. Defaults require a visible HTTP write.

        ...(optimisticValue
          ? {
              // An error, not a warning: a warning leaves `npm run lint` green, so a toggle whose
              // state never follows the saved record ships.
              'molecule-local/server-toggles-use-optimistic-value': 'error',
            }
          : {}),
        'molecule-local/buttons-have-an-action': 'warn',
        'molecule-local/placeholders-stay-out-of-record-fields': 'error',
        'molecule-local/links-reach-the-view-they-select': 'warn',
        ...(queryCache
          ? {
              'molecule-local/fetch-hooks-use-the-query-cache': 'error',
              'molecule-local/no-stand-in-query-record': 'error',
            }
          : {}),
        'molecule-local/no-block-in-paragraph': 'warn',
        'molecule-local/require-catch-binding': 'warn',
        // A full date-time prefix without its milliseconds or UTC marker loses
        // information: two updates in one second can serialize as the same value.
        // Date-only keys and clock-only display slices remain valid.
        ...(apiWorkspace ? { 'molecule-local/no-unanswered-optional-guard': 'error' } : {}),
        'molecule-local/no-resource-table-writes': ['error', resourceOwners],

        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            // The companion the other two patterns always implied. Handlers strip
            // secrets from a row with an omit-destructure —
            // `const { correct_answer: _correctAnswer, ...safe } = question` — where
            // the binding exists precisely so the key is DROPPED and is never read.
            // Without this the deliberate `_` prefix meant nothing for variables and
            // the pattern warned in a freshly-scaffolded project.
            varsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        // A `declare global { namespace Express { … } }` augmentation (or a
        // `declare module 'express-serve-static-core'`) is the standard way to
        // type `req.<field>`. It is a type-only declaration, not the runtime
        // namespacing this rule exists to discourage, so it is allowed; every
        // other namespace is still an error.
        '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
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
        '@typescript-eslint/naming-convention': [
          'warn',
          { selector: 'interface', format: ['PascalCase'] },
          { selector: 'typeAlias', format: ['PascalCase'] },
          { selector: 'enum', format: ['PascalCase'] },
          { selector: 'enumMember', format: ['PascalCase'] },
          {
            // snake_case is allowed: handlers routinely destructure snake_case DB
            // columns / query params (e.g. const { space_id, parent_id } = req.query),
            // which the flagship templates do pervasively. Without this the build
            // verifier (eslint --max-warnings 0) fails working code that merely
            // mirrors the template convention.
            selector: 'variable',
            modifiers: ['const'],
            format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allow',
          },
          {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'snake_case'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allow',
          },
          {
            // snake_case allowed here for the SAME reason as the `variable`
            // selector above, which has permitted it since the flagship fleet
            // landed: these names mirror DB columns / query params. A handler that
            // destructures `{ space_id }` into a variable was already fine, but
            // the helper that TAKES `space_id` as a parameter was not — the same
            // convention, failing on which side of the call it appeared. That
            // inconsistency failed `npm run lint` in 12 freshly-scaffolded
            // projects' own test suites.
            selector: 'parameter',
            format: ['camelCase', 'snake_case'],
            leadingUnderscore: 'allowSingleOrDouble',
          },
          { selector: 'function', format: ['camelCase', 'PascalCase'] },
          { selector: 'typeLike', format: ['PascalCase'] },
        ],
      },
    },
    ...(metroWorkspace
      ? [
          {
            // Vitest runs the tests under Vite, which defines these members; Metro bundles the rest.
            files: ['**/*.{ts,tsx,js,jsx,mjs}'],
            ignores: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
            rules: { 'molecule-local/no-vite-import-meta': 'error' },
          },
        ]
      : []),
    {
      // Components live in .tsx — relax explicit return types there.
      files: ['**/*.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    ...COMPONENT_FILES,
    {
      // Same relaxation for test files, and for the same reason `.tsx` gets it: a
      // test double's return type IS its object literal (`makeRes()` returning
      // `{ statusCode, status(), json() }`), so spelling it out restates the body
      // and then drifts from it. The molecule monorepo's own eslint config has
      // carried this exact override for `**/__tests__/**` since the rule landed;
      // the shipped template config simply never got it, which left 386 warnings
      // across the fleet's test suites — i.e. `npm run lint` failed in a
      // freshly-scaffolded project before the user wrote a line.
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      // Accessibility gate (eslint-plugin-jsx-a11y): the full `recommended`
      // ruleset at its native ERROR severity. Errors on purpose — a warning
      // gate nobody fails is decoration; a11y regressions the linter can see
      // statically (missing alt text, unlabeled controls, invalid ARIA,
      // mouse-only interactions) must fail lint the same way a type error
      // fails the build. Scoped to JSX files because this config is shared by
      // the app AND api workspaces and jsx-a11y is only meaningful where JSX
      // is written. What eslint can't see statically (color contrast,
      // rendered focus order) is covered by the axe-core smoke in
      // e2e/a11y.spec.ts.
      files: ['**/*.{jsx,tsx}'],
      plugins: {
        'jsx-a11y': jsxA11yGate,
      },
      // Molecule's layout boxes render a plain <div> and forward every prop, so the rules read
      // them as the div they are: a clickable <Flex> needs the role and keys a clickable <div>
      // needs. Card is left out on purpose: an interactive Card is a button and handles its keys.
      settings: {
        'jsx-a11y': { components: { Container: 'div', Flex: 'div', Grid: 'div', Spacer: 'div' } },
      },
      rules: {
        ...jsxA11y.flatConfigs.recommended.rules,
        // Same ERROR severity as recommended; only the control/text search depth
        // is raised (default 2). Template forms nest the label text in styled
        // spans (<label><span><span>{t('…')}</span></span></label>), which a
        // depth-2 scan can't see even though screen readers read it fine. A
        // label with NO text at any depth still fails.
        'jsx-a11y/label-has-associated-control': ['error', { depth: 25 }],
        // A scrolling container must be keyboard-reachable (axe `scrollable-region-focusable`),
        // and the WCAG pattern for it is `tabIndex={0}` on a NAMED `role="region"`. The rule's default
        // allows tabIndex on no non-interactive role but `tabpanel`, so that pattern would not lint;
        // `region` is added and nothing else — a tabIndex on a bare div or any other role still fails.
        'jsx-a11y/no-noninteractive-tabindex': [
          'error',
          {
            roles: ['tabpanel', 'region'],
            tags: [],
            allowExpressionValues: true,
          },
        ],
        // A list styled without bullets loses its list role in Safari/VoiceOver, and the fix is
        // `role="list"` on the <ul>/<ol>. The rule's default allows only <nav role="navigation">;
        // the list roles are added and nothing else, so any other redundant role still fails.
        'jsx-a11y/no-redundant-roles': [
          'error',
          { nav: ['navigation'], ul: ['list'], ol: ['list'] },
        ],
      },
    },
    {
      // React's hook rules apply when the workspace depends on React, to BOTH .ts and
      // .tsx: custom hooks (use*.ts, lib/api.ts) legitimately live in .ts files and
      // must be linted for hook correctness. Every other workspace (an api, or a Vue,
      // Solid, Svelte or Angular app, whose binding `use*` functions are not React
      // hooks) turns them off. The plugin stays registered everywhere, so a
      // react-hooks/exhaustive-deps disable comment resolves instead of erroring
      // "rule definition not found".
      files: ['**/*.{ts,tsx}'],
      plugins: {
        'react-hooks': reactHooks,
      },
      rules: {
        // Set rules explicitly rather than spreading reactHooks.configs.*,
        // whose shape varies across plugin versions.
        'react-hooks/rules-of-hooks': reactWorkspace ? 'error' : 'off',
        'react-hooks/exhaustive-deps': reactWorkspace ? 'warn' : 'off',
      },
    },
    {
      // The lint script covers src/ only; these files are linted when a build tool or an editor
      // checks the file it changed. scripts/*.mjs runs under Node, unbundled.
      files: ['scripts/**/*.mjs'],
      languageOptions: {
        globals: {
          console: 'readonly',
          process: 'readonly',
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      // public/*.js ships to the browser as written (no bundler): it runs with
      // the browser's globals. Without them the template's own site.js failed
      // lint with `'document' is not defined` as soon as a build edited it, and
      // the builder spent a fix round on the lint config (x440, 2026-09-29).
      files: ['public/**/*.js'],
      languageOptions: {
        sourceType: 'script',
        globals: {
          window: 'readonly',
          document: 'readonly',
          navigator: 'readonly',
          location: 'readonly',
          history: 'readonly',
          console: 'readonly',
          setTimeout: 'readonly',
          clearTimeout: 'readonly',
          setInterval: 'readonly',
          clearInterval: 'readonly',
          requestAnimationFrame: 'readonly',
          cancelAnimationFrame: 'readonly',
          getComputedStyle: 'readonly',
          matchMedia: 'readonly',
          fetch: 'readonly',
          URL: 'readonly',
          URLSearchParams: 'readonly',
          localStorage: 'readonly',
          sessionStorage: 'readonly',
          IntersectionObserver: 'readonly',
          ResizeObserver: 'readonly',
          MutationObserver: 'readonly',
          CustomEvent: 'readonly',
          Event: 'readonly',
          HTMLElement: 'readonly',
          Element: 'readonly',
          innerWidth: 'readonly',
          innerHeight: 'readonly',
          scrollX: 'readonly',
          scrollY: 'readonly',
          scrollTo: 'readonly',
          scrollBy: 'readonly',
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      ignores: ['dist/', 'node_modules/', '.svelte-kit/'],
    },
  )
}
