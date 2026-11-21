/**
 * Visual condition / rule builder for Angular.
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
 * ```ts
 * import { Component } from '@angular/core'
 * import { emptyGroup, RuleBuilder, type Rule, type RuleSchema } from '@molecule/app-rule-builder-angular'
 *
 * const schema: RuleSchema = {
 *   fields: [
 *     { name: 'country', label: 'Country', type: 'select', options: [{ value: 'US', label: 'United States' }] },
 *     { name: 'plan', label: 'Plan', type: 'text' },
 *     { name: 'spend', label: 'Spend', type: 'number' },
 *   ],
 * }
 *
 * @Component({
 *   selector: 'app-rules',
 *   standalone: true,
 *   imports: [RuleBuilder],
 *   template: `<div mol-rule-builder [schema]="schema" [rules]="rules" [onChange]="changed"></div>`,
 * })
 * export class Rules {
 *   readonly schema = schema
 *   rules: Rule = emptyGroup('AND')
 *
 *   changed = (next: Rule): void => {
 *     this.rules = next
 *   }
 * }
 * ```
 *
 * @remarks
 * - `<RuleBuilder>` needs an i18n provider (`provideMolecule({ i18n })` or the
 *   bonded `@molecule/app-i18n` provider) and a bonded ClassMap
 *   (`setClassMap()`); rendering throws otherwise.
 * - Output is a plain JSON-serializable `Rule` tree — this package only
 *   renders and edits it. Evaluation (matching rows/users against the tree)
 *   is the app's job, typically server-side.
 * - Fully controlled: keep the tree in a component field and pass it back via
 *   `rules`; start with `emptyGroup('AND')`. `onChange` receives the full new
 *   root rule as an input, an ordinary function.
 * - Translations: registered companion bond `@molecule/app-locales-rule-builder`.
 *
 * @module
 */

export * from './operators.js'
export * from './rule-builder.component.js'
export * from './types.js'
export * from './utilities.js'
