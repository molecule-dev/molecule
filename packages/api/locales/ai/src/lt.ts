import type { AiTranslations } from './types.js'

/** Ai translations for Lithuanian. */
export const lt: AiTranslations = {
  'ai.error.noProvider': 'AI tiekėjas nesukonfigūruotas. Pirmiausia susiekite AI tiekėją.',
  'ai.error.ambiguousProvider':
    'Susieta kelis pavadintus AI tiekėjus, o numatytasis nenustatytas. Naudokite getProviderByName(name), kad pasirinktumėte vieną.',
  'ai.error.responseIncomplete': 'DI atsakymas nutrūko prieš užbaigimą. Bandykite dar kartą.',
  'ai.error.responseTokenLimit':
    'Dirbtinio intelekto atsakas pasiekė išvesties žetonų limitą prieš užbaigimą.',
  'ai.error.apiError': 'Dirbtinio intelekto paslaugos klaida. Bandykite dar kartą.',
  'ai.error.noResponseBody': 'Nėra atsakymo iš DI paslaugos.',
}
