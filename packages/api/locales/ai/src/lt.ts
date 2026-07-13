import type { AiTranslations } from './types.js'

/** Ai translations for Lithuanian. */
export const lt: AiTranslations = {
  'ai.error.noProvider': 'AI tiekėjas nesukonfigūruotas. Pirmiausia susiekite AI tiekėją.',
  'ai.error.apiError': 'AI API užklausa nepavyko.',
  'ai.error.noResponseBody': 'AI atsakymo turinys yra tuščias.',
  'ai.error.ambiguousProvider':
    'Susieta kelis pavadintus AI tiekėjus, o numatytasis nenustatytas. Naudokite getProviderByName(name), kad pasirinktumėte vieną.',
}
