import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

/**
 * Local rules enforcing AGENTS.md Rule 14 (no silent error swallows).
 * `require-catch-binding` forbids bindingless `catch {` so every error can be
 * logged or explicitly ignored; with no-unused-vars caughtErrors:'all' +
 * caughtErrorsIgnorePattern:'^_', a catch must use the error or be a
 * `catch (_error)` documented noop.
 */
const moleculeLocal = {
  rules: {
    'require-catch-binding': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require a binding in catch clauses so the error can be logged or explicitly ignored',
        },
        schema: [],
        messages: {
          missing:
            'Bind the caught error: `catch (error)` to log it, or `catch (_error)` + a comment for an intentional noop (AGENTS Rule 14 — no silent error swallows).',
        },
      },
      create(context) {
        return {
          CatchClause(node) {
            if (!node.param) context.report({ node, messageId: 'missing' })
          },
        }
      },
    },
  },
}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript'],
  prettier,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'molecule-local': moleculeLocal,
    },
    rules: {
      'molecule-local/require-catch-binding': 'error',
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
      // export stays documented for the MOLECULE.md auto-gen / AI codegen, but
      // drop the very strict per-param / per-return detail rules (~3k warnings,
      // mostly self-evident params). Re-enable per-package if a package wants
      // fuller param docs.
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/check-tag-names': ['warn', { definedTags: ['module', 'remarks', 'defaultValue'] }],
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
      '@typescript-eslint/naming-convention': [
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
      ],
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
          patterns: [
            {
              group: ['@molecule/api-*'],
              message:
                'App packages cannot import from @molecule/api-* packages. This is a cross-stack boundary violation.',
            },
          ],
        },
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
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'packages/**/dist/',
      'packages/**/node_modules/',
      'packages/**/*.d.ts',
      'packages/**/*.js',
      'packages/**/*.js.map',
    ],
  },
)
