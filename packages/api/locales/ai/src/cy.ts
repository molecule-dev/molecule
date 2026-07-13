import type { AiTranslations } from './types.js'

/** Ai translations for Welsh. */
export const cy: AiTranslations = {
  'ai.error.noProvider': "Nid yw darparwr AI wedi'i ffurfweddu. Bondiwch ddarparwr AI yn gyntaf.",
  'ai.error.apiError': 'Methodd cais API AI.',
  'ai.error.noResponseBody': 'Mae corff ymateb AI yn wag.',
  'ai.error.ambiguousProvider':
    "Mae sawl darparwr AI wedi'u henwi wedi'u bondio ac ni osodwyd unrhyw un diofyn. Defnyddiwch getProviderByName(name) i ddewis un.",
}
