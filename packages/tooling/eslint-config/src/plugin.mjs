/**
 * The `molecule-local` ESLint plugin: every rule `moleculeEslintConfig` enables, plus the
 * rules the Molecule repositories enable in their own configs.
 *
 * @module
 */

import tseslint from 'typescript-eslint'

import noClassCode from './rules/no-class-code.mjs'
import noDroppedAction from './rules/no-dropped-action.mjs'
import noDuplicateListWrapper from './rules/no-duplicate-list-wrapper.mjs'
import {
  interactiveTargetRule as noEmptyInteractiveTarget,
  requireIconFontSetup,
} from './rules/no-empty-interactive-target.mjs'
import { noHandStyledButton } from './rules/no-hand-styled-button.mjs'
import { noLiteralUiText } from './rules/no-literal-ui-text.mjs'
import noMockReturnedFromHook from './rules/no-mock-returned-from-hook.mjs'
import { noRawClassNames } from './rules/no-raw-class-names.mjs'
import noResourceTableWrites from './rules/no-resource-table-writes.mjs'
import noStandInQueryRecord from './rules/no-stand-in-query-record.mjs'
import noVacuousOptionalChainAssertion from './rules/no-vacuous-optional-chain-assertion.mjs'
import noViteImportMeta from './rules/no-vite-import-meta.mjs'
import preferDeclaredClients from './rules/prefer-declared-clients.mjs'
import { scaffoldRules } from './rules/scaffold/index.mjs'

/**
 * The plugin object, registered as `molecule-local` so a rule is named
 * `molecule-local/<rule>` in every project and disable comment.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
export const moleculeLocalPlugin = {
  rules: {
    'no-class-code': noClassCode,
    'no-empty-interactive-target': noEmptyInteractiveTarget,
    'require-icon-font-setup': requireIconFontSetup,
    'no-dropped-action': noDroppedAction,
    'no-duplicate-list-wrapper': noDuplicateListWrapper,
    'no-resource-table-writes': noResourceTableWrites,
    'no-stand-in-query-record': noStandInQueryRecord,
    'prefer-declared-clients': preferDeclaredClients,
    'no-hand-styled-button': noHandStyledButton,
    'no-raw-class-names': noRawClassNames,
    'no-literal-ui-text': noLiteralUiText,
    'no-vite-import-meta': noViteImportMeta,
    'no-vacuous-optional-chain-assertion': noVacuousOptionalChainAssertion,
    'no-mock-returned-from-hook': noMockReturnedFromHook,
    ...scaffoldRules(tseslint.parser),
  },
}
