/** Translation keys for the rule-builder locale package. */
export type RuleBuilderTranslationKey =
  | 'ruleBuilder.op.and'
  | 'ruleBuilder.op.or'
  | 'ruleBuilder.help.allMustMatch'
  | 'ruleBuilder.help.anyMustMatch'
  | 'ruleBuilder.action.addCondition'
  | 'ruleBuilder.action.addGroup'
  | 'ruleBuilder.action.removeCondition'
  | 'ruleBuilder.action.removeGroup'
  | 'ruleBuilder.aria.toggleOp'
  | 'ruleBuilder.aria.removeGroup'
  | 'ruleBuilder.aria.removeCondition'
  | 'ruleBuilder.aria.field'
  | 'ruleBuilder.aria.operator'
  | 'ruleBuilder.aria.value'
  | 'ruleBuilder.aria.valueFrom'
  | 'ruleBuilder.aria.valueTo'
  | 'ruleBuilder.field.placeholder'
  | 'ruleBuilder.between.separator'
  | 'ruleBuilder.boolean.true'
  | 'ruleBuilder.boolean.false'

/** Translation record mapping rule-builder keys to translated strings. */
export type RuleBuilderTranslations = Record<RuleBuilderTranslationKey, string>
