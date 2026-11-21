/**
 * Visual condition / rule builder for Solid.
 *
 * Exports:
 * - `<RuleBuilder>` — controlled tree editor for AND / OR groups of
 *   field-operator-value leaves.
 * - `RuleSchema`, `RuleField`, `RuleOperator`, `Rule`, `RuleGroup`,
 *   `RuleLeaf`, `RuleLeafValue`, `RuleGroupOp`, `RuleFieldType` types.
 * - `defaultOperators`, `operatorsFor`, `operatorById`, `OP` operator
 *   catalog helpers.
 * - `emptyGroup`, `emptyLeaf`, `replaceById`, `removeById`,
 *   `appendToGroup`, `toggleGroupOp`, `makeId` pure tree utilities.
 *
 * Used by feature-flag-manager (audience targeting),
 * ai-workflow-automator (trigger conditions), email-marketing
 * (segments), iot-device-manager + smart-home-dashboard (scenes /
 * automations).
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import {
 *   RuleBuilder,
 *   emptyGroup,
 *   type Rule,
 *   type RuleSchema,
 * } from '@molecule/app-rule-builder-solid'
 *
 * const schema: RuleSchema = {
 *   fields: [
 *     { name: 'country', label: 'Country', type: 'select', options: [{ value: 'US', label: 'United States' }] },
 *     { name: 'plan', label: 'Plan', type: 'text' },
 *     { name: 'spend', label: 'Spend', type: 'number' },
 *   ],
 * }
 *
 * function Demo() {
 *   const [rules, setRules] = createSignal<Rule>(emptyGroup('AND'))
 *   return <RuleBuilder schema={schema} rules={rules()} onChange={setRules} />
 * }
 * ```
 *
 * @remarks
 * - `<RuleBuilder>` throws unless rendered inside a Solid app whose
 *   `MoleculeProvider` supplies an i18n provider (bonded `@molecule/app-i18n`
 *   is the fallback) with a bonded ClassMap (`setClassMap()`).
 * - Output is a plain JSON-serializable `Rule` tree — this package only
 *   renders and edits it. Evaluation (matching rows/users against the tree)
 *   is the app's job, typically server-side.
 * - Fully controlled: keep the tree in a signal and pass it back via `rules`;
 *   start with `emptyGroup('AND')`.
 * - Translations: registered companion bond `@molecule/app-locales-rule-builder`.
 *
 * @module
 */

export * from './operators.js'
export * from './RuleBuilder.jsx'
export * from './types.js'
export * from './utilities.js'
