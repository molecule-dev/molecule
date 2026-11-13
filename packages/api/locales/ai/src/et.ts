import type { AiTranslations } from './types.js'

/** Ai translations for Estonian. */
export const et: AiTranslations = {
  'ai.error.noProvider': 'AI pakkuja pole seadistatud. Ühendage esmalt AI pakkuja.',
  'ai.error.ambiguousProvider':
    'Mitu nimega AI pakkujat on ühendatud ja vaikepakkujat pole määratud. Kasutage ühe valimiseks getProviderByName(name).',
  'ai.error.responseIncomplete': 'Tehisintellekti vastus lõppes enne lõppu. Palun proovige uuesti.',
  'ai.error.responseTokenLimit':
    'Tehisintellekti vastus saavutas väljundtokenite limiidi enne lõpetamist.',
  'ai.error.apiError': 'Tehisintellekti teenuse viga. Palun proovige uuesti.',
  'ai.error.noResponseBody': 'Tehisintellekti teenuselt pole vastust.',
}
