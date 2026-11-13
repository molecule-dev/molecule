import type { AiTranslations } from './types.js'

/** Ai translations for Irish. */
export const ga: AiTranslations = {
  'ai.error.noProvider': 'Níl soláthraí AI cumraithe. Ceangail soláthraí AI ar dtús.',
  'ai.error.ambiguousProvider':
    'Tá roinnt soláthraithe AI ainmnithe ceangailte agus níor socraíodh réamhshocrú ar bith. Bain úsáid as getProviderByName(name) chun ceann a roghnú.',
  'ai.error.responseIncomplete': 'Críochnaíodh an freagra AI roimh chríochnú. Déan iarracht arís.',
  'ai.error.responseTokenLimit':
    'Shroich freagra na hintleachta saorga an teorainn aschuir comharthaí roimh chríochnú.',
  'ai.error.apiError': 'Earráid seirbhíse AI. Déan iarracht arís.',
  'ai.error.noResponseBody': 'Gan freagra ó sheirbhís AI.',
}
