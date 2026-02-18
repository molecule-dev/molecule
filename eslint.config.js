import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript'],
  prettier,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
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
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/check-tag-names': [
        'warn',
        { definedTags: ['module', 'remarks'] },
      ],
      'jsdoc/check-param-names': 'warn',
      'jsdoc/tag-lines': 'off',
      'jsdoc/require-throws-type': 'warn',
      'jsdoc/escape-inline-tags': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
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
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
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
    ],
  },
)
