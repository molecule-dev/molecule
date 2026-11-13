import type { AiTranslations } from './types.js'

/** Ai translations for Hungarian. */
export const hu: AiTranslations = {
  'ai.error.noProvider':
    'Az AI szolgáltató nincs konfigurálva. Először kössön be egy AI szolgáltatót.',
  'ai.error.ambiguousProvider':
    'Több elnevezett AI szolgáltató van bekötve, és nincs beállítva alapértelmezett. Használja a getProviderByName(name) függvényt egy kiválasztásához.',
  'ai.error.responseIncomplete':
    'A mesterséges intelligencia válasza a befejezés előtt véget ért. Próbáld újra.',
  'ai.error.responseTokenLimit':
    'A mesterséges intelligencia válasza elérte a kimeneti token korlátot a befejezés előtt.',
  'ai.error.apiError': 'AI szolgáltatáshiba. Kérjük, próbáld újra.',
  'ai.error.noResponseBody': 'Nincs válasz a mesterséges intelligencia szolgáltatástól.',
}
