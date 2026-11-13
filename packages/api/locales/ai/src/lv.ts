import type { AiTranslations } from './types.js'

/** Ai translations for Latvian. */
export const lv: AiTranslations = {
  'ai.error.noProvider':
    'AI pakalpojumu sniedzējs nav konfigurēts. Vispirms pievienojiet AI pakalpojumu sniedzēju.',
  'ai.error.ambiguousProvider':
    'Ir pievienoti vairāki nosaukti AI pakalpojumu sniedzēji, un noklusējuma nav iestatīts. Izmantojiet getProviderByName(name), lai izvēlētos vienu.',
  'ai.error.responseIncomplete':
    'Mākslīgā intelekta atbilde tika pārtraukta pirms pabeigšanas. Lūdzu, mēģiniet vēlreiz.',
  'ai.error.responseTokenLimit':
    'Mākslīgā intelekta atbilde sasniedza izvades marķiera ierobežojumu pirms pabeigšanas.',
  'ai.error.apiError': 'Mākslīgā intelekta pakalpojuma kļūda. Lūdzu, mēģiniet vēlreiz.',
  'ai.error.noResponseBody': 'Nav atbildes no AI pakalpojuma.',
}
