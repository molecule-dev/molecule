import type { AiTranslations } from './types.js'

/** Ai translations for Estonian. */
export const et: AiTranslations = {
  'ai.error.noProvider': 'AI pakkuja pole seadistatud. Ühendage esmalt AI pakkuja.',
  'ai.error.apiError': 'AI API päring ebaõnnestus.',
  'ai.error.noResponseBody': 'AI vastuse keha on tühi.',
  'ai.error.ambiguousProvider':
    'Mitu nimega AI pakkujat on ühendatud ja vaikepakkujat pole määratud. Kasutage ühe valimiseks getProviderByName(name).',
}
