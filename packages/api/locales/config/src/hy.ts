import type { ConfigTranslations } from './types.js'

/** Config translations for Armenian. */
export const hy: ConfigTranslations = {
  'config.error.required': "Պահանջվող կազմաձևումը '{{key}}' տեղադրված չէ։",
  'config.error.mustBeNumber': "Կազմաձևումը '{{key}}' պետք է լինի թիվ։",
  'config.error.minValue': "Կազմաձևումը '{{key}}' պետք է լինի առնվազն {{min}}։",
  'config.error.maxValue': "Կազմաձևումը '{{key}}' պետք է լինի առավելագույնը {{max}}։",
  'config.error.mustBeBoolean': "Կազմաձևումը '{{key}}' պետք է լինի բուլյան արժեք (true/false/1/0)։",
  'config.error.mustBeJson': "Կազմաձևումը '{{key}}' պետք է լինի վավեր JSON։",
  'config.error.patternMismatch': "Կազմաձևումը '{{key}}' չի համընկնում '{{pattern}}' ձևանմուշին։",
  'config.error.invalidEnum': "Կազմաձևումը '{{key}}' պետք է լինի հետևյալներից մեկը՝ {{values}}։",
  'config.error.validationNotSupported': 'Ներկայիս կազմաձևման մատակարարը չի աջակցում վավերացումը։',
}
