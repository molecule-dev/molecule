/** Translation keys for the bias-indicator-react locale package. */
export type BiasIndicatorTranslationKey =
  | 'biasIndicator.bias.farLeft'
  | 'biasIndicator.bias.leftLeaning'
  | 'biasIndicator.bias.center'
  | 'biasIndicator.bias.rightLeaning'
  | 'biasIndicator.bias.farRight'
  | 'biasIndicator.reliability.high'
  | 'biasIndicator.reliability.medium'
  | 'biasIndicator.reliability.low'
  | 'biasIndicator.reliability.disputed'

/** Translation record mapping bias-indicator keys to translated strings. */
export type BiasIndicatorTranslations = Record<BiasIndicatorTranslationKey, string>
